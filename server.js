import express from 'express'
import {resolve} from 'node:path'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import {createConfigStore} from './server-config-store.js'

const app = express()
const port = process.env.PORT || 80

const NAV_PASSWORD = process.env.NAV_PASSWORD || 'admin'
const JWT_SECRET = process.env.NAV_JWT_SECRET || ('nav-app-secret-' + NAV_PASSWORD)
const PASSWORD_HASH = bcrypt.hashSync(NAV_PASSWORD, 10)
const configStore = await createConfigStore()

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
    const cfg = configStore.getConfig()
    res.json({ avatar: cfg?.avatar || null, name: cfg?.greeting?.name || null })
  } catch {
    res.json({ avatar: null, name: null })
  }
})

// Public endpoint: return only public categories, links, and dock items
app.get('/api/config/public', (_req, res) => {
  try {
    const cfg = configStore.getConfig()
    if (!cfg) return res.status(500).json({ error: 'Config not found' })

    // Filter categories: only public categories with public links
    const categories = (cfg.categories || [])
      .filter((cat) => cat.public === true)
      .map((cat) => {
        const links = (cat.links || [])
          .filter((link) => link.public === true)
          .map(({ public: _p, ...rest }) => rest)
        const { public: _p, ...catRest } = cat
        return { ...catRest, links }
      })

    // Filter dock items: only public, exclude settings action
    const dockItems = (cfg.dock?.items || [])
      .filter((item) => item.public === true && item.action !== 'settings')
      .map(({ public: _p, ...rest }) => rest)

    const dockUtilities = (cfg.dock?.utilities || [])
      .filter((item) => item.public === true && item.action !== 'settings')
      .map(({ public: _p, ...rest }) => rest)

    res.json({
      greeting: cfg.greeting,
      menuBar: cfg.menuBar,
      settings: cfg.settings,
      favicon: cfg.favicon,
      avatar: cfg.avatar,
      categories,
      dock: { items: dockItems, utilities: dockUtilities },
    })
  } catch {
    res.status(500).json({ error: 'Config not found' })
  }
})

app.get('/api/verify', requireAuth, (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/config', requireAuth, (_req, res) => {
  try {
    res.json(configStore.getConfig())
  } catch {
    res.status(500).json({ error: 'Config not found' })
  }
})

app.put('/api/config', requireAuth, (req, res) => {
  try {
    configStore.saveConfig(req.body)
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
