'use strict'

const {log} = require('./internal')('core')

const TeleBot = require('telebot')

const _ERROR = require('./error')
const _EXEC = require('./exec')
const _FETCH = require('./fetch')
const _QUEUE = require('./queue')
const _TMP = require('./tmp')

module.exports = (id, {token, helloMessage, TMP, FETCH, breakSymetry}) => {
  log('inizializing')

  // base initialization
  const bot = new TeleBot({
    token,
    polling: { // Optional. Use polling.
      interval: 1000, // Optional. How often check updates (in ms).
      timeout: 0, // Optional. Update polling timeout (0 - short polling).
      limit: 10, // Optional. Limits the number of updates to be retrieved.
      retryTimeout: 2000 // Optional. Reconnecting timeout (in ms).
    }
  })

  if (helloMessage) {
    bot.on(['/start', '/hello', '/help'], (msg) => msg.reply.text(helloMessage, {webPreview: false, parseMode: 'markdown'}))
  }

  // component initialization
  const error = _ERROR(bot, breakSymetry)
  const queue = _QUEUE()
  const tmp = _TMP(id, TMP || {})
  const fetch = _FETCH(bot, tmp, FETCH || {})

  return {
    start: () => {
      log('starting')
      tmp.start()
      bot.start()
    },
    stop: () => {
      log('stopping')
      bot.stop()
      tmp.stop()
    },

    bot,
    error,
    exec: _EXEC,
    fetch,
    tmp: tmp.getTmpFile,
    queue
  }
}
