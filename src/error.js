'use strict'

const {log, warn} = require('./internal')('error')
const ERROR_REPLY = 'Sorry, but something went wrong internally'

const Sentry = require('@sentry/node')

module.exports = (bot, hooks, breakSymetry) => { // TODO: move hooks to main, add this as hook
  Sentry.init({dsn: process.env.SENTRY_DSN})

  const origOn = bot.on.bind(bot)
  bot.on = (ev, fnc, ...a) => {
    let wrapped = async (msg, ...a) => {
      hooks.forEach(fnc => fnc(msg, ...a))

      try {
        let res = await fnc(msg, ...a)
        return res
      } catch (err) {
        if (err.ok === false && !(err instanceof Error)) {
          let _e = err
          err = new Error(`Telebot: [${err.error_code}] ${err.description}`) // eslint-disable-line no-ex-assign
          Object.assign(err, _e) // justification for the above: really our exception parameter is not an exception, so we make it one
        }

        log(err)

        if (err.description === 'Forbidden: bot was blocked by the user') { // completly ignore blocks
          return
        }

        if (!err.friendly) { // don't catch user generated errors
          warn(err.stack)

          Sentry.withScope(scope => {
            const msgChannelType = msg.chat.type
            const msgIsForward = Boolean(msg.forward) // TODO: test
            const msgContentType = ['text', 'photo', 'video', 'videoNote', 'file', 'sticker', 'audio', 'voice', 'game', 'action', 'location', 'place'].filter(type => Boolean(msg[type]))[0]
            const msgType = msgChannelType + '.' + (msgIsForward ? 'forward+' : '') + msgContentType

            scope.setTag('type', msgType)
            scope.setUser(msg.from)

            scope._breadcrumbs.push({
              timestamp: msg.date,
              category: 'telegram',
              level: 'log',
              message: `Recieved ${msgChannelType} ${msgContentType} message (forwarded ${msgIsForward})`
            })

            Sentry.captureException(err)
          })
        }

        try {
          msg.reply.text(err.friendly || ERROR_REPLY)
        } catch (err) {
          // ignore
        }
      }
    }

    if (breakSymetry) {
      origOn(ev, (...a) => { // this DOESN'T queue messages since it doesn't return a promise
        wrapped(...a)
      }, ...a)
    } else {
      return origOn(ev, wrapped, ...a)
    }
  }

  return Sentry
}
