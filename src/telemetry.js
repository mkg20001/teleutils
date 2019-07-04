'use strict'

const {log} = require('./internal')('telemetry')

const MatomoTracker = require('matomo-tracker')
const crypto = require('crypto')

const sha256 = (str) => crypto.createHash('sha256').update(String(str)).digest('hex')
const anon = (id) => sha256(sha256(id)).substr(0, 12)

module.exports = (id, error, {siteId, server}) => {
  if (!server) {
    log('tracking disabled')
    return {
      wrapper: async () => async () => {},
      track: async () => {}
    }
  }

  const client = new MatomoTracker(siteId, `https://${server}/matomo.php`)
  client.on('error', (err) => {
    log(err)
    error.captureException(err)
  })

  function trackerWrapper (msg) {
    const UserID = anon(msg.from.id)

    const msgChannelType = msg.chat.type
    const msgIsForward = Boolean(msg.forward) // TODO: test
    const msgContentType = ['text', 'photo', 'video', 'videoNote', 'file', 'sticker', 'audio', 'voice', 'game', 'action', 'location', 'place'].filter(type => Boolean(msg[type]))[0]
    const msgType = msgChannelType + '.' + (msgIsForward ? 'forward+' : '') + msgContentType

    const preparedData = {
      msgChannelType,
      msgIsForward,
      msgContentType,
      msgType
    }

    return (eventName, data) => {
      if (!data) {
        data = {}
      }

      Object.assign(data, preparedData)

      return trackEvent(UserID, eventName, data)
    }
  }

  /*
   * trackEvent will send a new event with specific data to the current tracking
   * or event system. This helps developing the application by tracking anonymous
   * data from the users behaivour. The user can opt-out or opt-in at any time
   * from the settings or welcome page.
   *
   * It returns a Promise
   */
  async function trackEvent (UserID, eventName, data) {
    log('tracking event %s', eventName)
    // Check if the user allowed tracking and if the user has an ID already
    const customData = [
      // ['version', `${pjson.version}-${pjson.hash}`]
    ]

    // If the event is `app/started` then count this as a new visit
    // const newVisit = eventName === 'app/started'

    const newVisit = true // for now leave this as is, later track per conversation, when having more complex interactions

    // Transform data keys into readable matomo objects
    Object.keys(data).forEach((key) => {
      customData.push([key, JSON.stringify(data[key])])
    })

    const eventData = eventName.split('/')
    return client.track({
      // If the eventName is its own, then mark it as a "view"
      action_name: eventData[0] === eventName ? 'pageview' : eventName,
      cvar: JSON.stringify(customData),
      e_a: eventData[1] || 'pageview',
      e_c: eventData[0],
      e_n: eventName,
      new_visit: newVisit,
      // ua
      uid: `${UserID}`,
      url: `https://${id}.tg.com/${eventData[0]}`
    })
  }

  return {
    wrapper: trackerWrapper,
    track: trackEvent
  }
}
