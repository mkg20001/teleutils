'use strict'

const {log, warn} = require('./internal')('error')
const ERROR_REPLY = 'Sorry, but something went wrong internally'

const Sentry = require('@sentry/node')

module.exports = (bot, breakSymetry) => {
  Sentry.init({dsn: process.env.SENTRY_DSN})

  const origOn = bot.on.bind(bot)
  bot.on = (ev, fnc, ...a) => {
    let wrapped = async (msg, ...a) => {
      try {
        let res = await fnc(msg, ...a)
        return res
      } catch (err) {
        if (err.ok === false && !(err instanceof Error)) {
          let _e = err
          err = new Error(`Telebot: [${err.error_code}] ${err.description}`)
          Object.assign(err, _e)
        }

        log(err)

        if (!err.friendly) { // don't catch user generated errors
          warn(err.stack)
          Sentry.captureException(err)
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
      origOn(ev, wrapped, ...a)
    }
  }

  return Sentry
}
