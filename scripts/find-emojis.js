const fs = require('fs')
const path = require('path')

const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/u

const dirs = ['app', 'components']

function scanDir(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const f of files) {
    const full = path.join(dir, f.name)
    if (f.isDirectory()) {
      scanDir(full)
    } else if (/\.(tsx|ts|jsx|js)$/.test(f.name)) {
      const content = fs.readFileSync(full, 'utf8')
      if (emojiRegex.test(content)) {
        console.log(`EMOJI FOUND: ${full}`)
      }
    }
  }
}

dirs.forEach((d) => scanDir(path.join(__dirname, '..', d)))
