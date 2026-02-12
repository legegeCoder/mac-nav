import express from 'express'
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import yaml from 'js-yaml'
import jwt from 'jsonwebtoken'

const app = express()
const port = process.env.PORT || 80

const CONFIG_PATH = process.env.CONFIG_PATH || resolve('./user-data/nav.yaml')
const DEFAULT_CONFIG_PATH = resolve('./dist/nav.default.yaml')
const NAV_PASSWORD = process.env.NAV_PASSWORD || 'admin'
const JWT_SECRET = process.env.NAV_JWT_SECRET || ('nav-app-secret-' + NAV_PASSWORD)

// Seed user-data/nav.yaml from default if missing
if (!existsSync(CONFIG_PATH)) {
  try {
    copyFileSync(DEFAULT_CONFIG_PATH, CONFIG_PATH)
    console.log(`Seeded ${CONFIG_PATH} from ${DEFAULT_CONFIG_PATH}`)
  } catch {
    console.warn(`Default config not found at ${DEFAULT_CONFIG_PATH}, skipping seed`)
  }
}

app.use(express.json())

app.post('/api/login', (req, res) => {
  const { password } = req.body
  if (password !== NAV_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' })
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' })
  }
}

app.get('/api/config', (_req, res) => {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    res.json(yaml.load(raw))
  } catch {
    res.status(500).json({ error: 'Config not found' })
  }
})

app.get('/api/default-config', (_req, res) => {
  try {
    const raw = readFileSync(DEFAULT_CONFIG_PATH, 'utf-8')
    res.json(yaml.load(raw))
  } catch {
    res.status(500).json({ error: 'Default config not found' })
  }
})

app.put('/api/config', requireAuth, (req, res) => {
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
