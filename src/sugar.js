'use strict'

const {log} = require('./internal')('sugar')

module.exports = (bot) => {
  bot.use(async (ctx, next) => {
    const start = new Date()

    const msgChannelType = ctx.chat.type
    const msgIsForward = Boolean(ctx.forward) // TODO: test
    const msgContentType = ['text', 'photo', 'video', 'videoNote', 'file', 'sticker', 'audio', 'voice', 'game', 'action', 'location', 'place'].filter(type => Boolean(ctx.message[type]))[0]
    const msgType = msgChannelType + '.' + (msgIsForward ? 'forward+' : '') + msgContentType

    ctx.meta = {
      msgChannelType,
      msgIsForward,
      msgContentType,
      msgType
    }

    await next(ctx)

    const ms = new Date() - start
    log('response time %sms', ms)
  })
}
