'use strict'

const {log} = require('./internal')('core')

const Telegraf = require('telegraf')

const _SUGAR = require('./sugar')
const _ERROR = require('./error')
const _EXEC = require('./exec')
const _FETCH = require('./fetch')
const _QUEUE = require('./queue')
const _TMP = require('./tmp')
const _TELEMETRY = require('./telemetry')

const getMatomoParams = () => {
  if (process.env.MATOMO_DSN) {
    const parsed = new URL(process.env.MATOMO_DSN)
    return {
      siteId: parseInt(parsed.username, 10),
      server: parsed.hostname
    }
  } else {
    return {}
  }
}

module.exports = (id, {token, telegrafOptions, helloMessage, TMP, FETCH, TELEMETRY, breakSymetry}) => {
  log('inizializing')
  let hooks = []

  // base initialization
  const bot = new Telegraf(token, telegrafOptions)

  _SUGAR(bot)

  // component initialization
  const error = _ERROR(bot, hooks, breakSymetry)
  const queue = _QUEUE()
  const tmp = _TMP(id, TMP || {})
  const fetch = _FETCH(bot, tmp, FETCH || {})
  const telemetry = _TELEMETRY(bot, id, error, TELEMETRY || getMatomoParams())

  if (helloMessage) {
    const hello = async (ctx) => {
      await ctx.track('bot/started')
      await ctx.replyWithMarkdown(helloMessage, {disable_web_page_preview: true})
    }
    bot.start(hello)
    bot.command('hello', hello)
    bot.command('help', hello)
  }

  return {
    start: async () => {
      log('starting')
      tmp.start()
      bot.launch()
    },
    stop: async () => {
      log('stopping')
      bot.stop()
      tmp.stop()
    },

    bot,
    error,
    exec: _EXEC,
    fetch,
    tmp: tmp.getTmpFile,
    queue,
    telemetry
  }
}
