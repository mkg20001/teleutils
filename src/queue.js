'use strict'

const {log} = require('./internal')('queue')

module.exports = () => {
  const queues = {}
  const wait = (time) => new Promise((resolve, reject) => setTimeout(resolve, time))

  async function initQueue (name, parallel, cool) {
    if (!queues[name]) {
      queues[name] = {working: 0, todo: [], parallel, cool}
    } else {
      throw new Error('ALREADY EXISTS')
    }
  }

  async function doQueue (name) {
    let item

    while ((item = queues[name].todo.shift())) {
      queues[name].working++
      log('processing queue %s (left %o, working %o, parallel %s)', name, queues[name].todo.length, queues[name].working, queues[name].parallel)
      try {
        let res = await item.fnc()
        item.resolve(res)
      } catch (err) {
        item.reject(err)
      }

      if (queues[name].cool) {
        await wait(queues[name].cool)
      }
      queues[name].working--
      log('processed queue %s (left %o, working %o, parallel %s)', name, queues[name].todo.length, queues[name].working, queues[name].parallel)
    }
  }

  function queue (name, fnc) {
    if (!queues[name]) { throw new Error('Not initialized') }
    log('adding to queue %s', name)
    return new Promise((resolve, reject) => {
      queues[name].todo.push({resolve, reject, fnc})
      if (queues[name].working < queues[name].parallel) { doQueue(name) }
    })
  }

  queue.init = initQueue
  queue._queues = queues

  return queue
}
