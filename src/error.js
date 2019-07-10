'use strict'

const {log, warn} = require('./internal')('error')
const ERROR_REPLY = 'Sorry, but something went wrong internally'

const Sentry = require('@sentry/node')

module.exports = (bot, hooks, breakSymetry) => { // TODO: move hooks to main, add this as hook
  Sentry.init({dsn: process.env.SENTRY_DSN})

  bot.use(async (ctx, next) => {
    try {
      let res = await next(ctx)
      return res
    } catch (err) {
      // console.log(require('util').inspect(ctx, {depth: null, colors: true}))
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
          scope.setTag('type', ctx.meta.msgType)
          scope.setUser(ctx.from)

          scope._breadcrumbs.push({
            timestamp: ctx.date,
            category: 'telegram',
            level: 'log',
            message: `Recieved ${ctx.meta.msgChannelType} ${ctx.meta.msgContentType} message (forwarded ${ctx.meta.msgIsForward})`
          })

          Sentry.captureException(err)
        })
      }

      try {
        ctx.reply.text(err.friendly || ERROR_REPLY)
      } catch (err) {
        // ignore
      }
    }
  })

  return Sentry
}
