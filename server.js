import express from 'express'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'

const app = express()
const port = process.env.PORT || 80

const CONFIG_PATH = process.env.CONFIG_PATH || resolve('./nav.yaml')
const FALLBACK_CONFIG_PATH = resolve('./dist/nav.yaml')

app.use(express.json())

app.get('/api/config', (_req, res) => {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    res.json(yaml.load(raw))
  } catch {
    try {
      const raw = readFileSync(FALLBACK_CONFIG_PATH, 'utf-8')
      res.json(yaml.load(raw))
    } catch {
      res.status(500).json({ error: 'Config not found' })
    }
  }
})

app.put('/api/config', (req, res) => {
  try {
    const text = yaml.dump(req.body, { lineWidth: -1, noRefs: true })
    writeFileSync(CONFIG_PATH, text, 'utf-8')
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to save config' })
  }
})

app.use(express.static(resolve('./dist')))

app.get('*path', (_req, res) => {
  res.sendFile(resolve('./dist/index.html'))
})

app.listen(port, () => {
  console.log(`nav-app listening on port ${port}`)
})
