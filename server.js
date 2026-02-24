import express from 'express'
import {copyFileSync, existsSync, readFileSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import yaml from 'js-yaml'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const app = express()
const port = process.env.PORT || 80

const CONFIG_PATH = process.env.CONFIG_PATH || resolve('./user-data/nav.yaml')
const SEED_CONFIG_PATH = resolve('./dist/nav.yaml')
const NAV_PASSWORD = process.env.NAV_PASSWORD || 'admin'
const JWT_SECRET = process.env.NAV_JWT_SECRET || ('nav-app-secret-' + NAV_PASSWORD)
const PASSWORD_HASH = bcrypt.hashSync(NAV_PASSWORD, 10)

// Seed user-data/nav.yaml from dist/nav.yaml if missing
if (!existsSync(CONFIG_PATH)) {
  try {
    copyFileSync(SEED_CONFIG_PATH, CONFIG_PATH)
    console.log(`Seeded ${CONFIG_PATH} from ${SEED_CONFIG_PATH}`)
  } catch {
    console.warn(`Seed config not found at ${SEED_CONFIG_PATH}, skipping`)
  }
}

app.use(express.json())

app.post('/api/login', (req, res) => {
  const { password } = req.body
  if (!bcrypt.compareSync(password, PASSWORD_HASH)) {
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

// Public endpoint: return only avatar & name for the login page
app.get('/api/login-profile', (_req, res) => {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    const cfg = yaml.load(raw)
    res.json({ avatar: cfg?.avatar || null, name: cfg?.greeting?.name || null })
  } catch {
    res.json({ avatar: null, name: null })
  }
})

app.get('/api/verify', requireAuth, (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/config', requireAuth, (_req, res) => {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    res.json(yaml.load(raw))
  } catch {
    res.status(500).json({ error: 'Config not found' })
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
