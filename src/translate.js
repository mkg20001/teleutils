'use strict'

const fs = require('fs')
const path = require('path')

module.exports = ({ localesDir, defLang = 'en' }) => {
  const translations = {
    [defLang]: {}
  }

  if (localesDir) {
    const files = fs.readdirSync(localesDir)
    files.forEach(file => {
      translations[file.split('.')[0]] = JSON.parse(String(fs.readFileSync(path.join(localesDir, file))))
    })
  }

  function translate (lang, input, ...a) {
    const map = translations[lang] || {}

    if (map[input]) input = map[input]

    input = input.replace(/%/gmi, () => a.shift() || '*?*')

    return input
  }

  return {
    translate,
    wrapper: (msg) => {
      const lang = msg.from.language_code || defLang

      return (...a) => translate(lang, ...a)
    }
  }
}
