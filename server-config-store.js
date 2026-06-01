import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import yaml from 'js-yaml'

const CONFIG_KEY = 'nav'
const DEFAULT_CONFIG_PATH = './user-data/nav.sqlite'
const DEFAULT_LEGACY_CONFIG_PATH = './user-data/nav.yaml'
const DEFAULT_SEED_CONFIG_PATH = './dist/nav.yaml'

let DatabaseSync

function isYamlPath(path) {
  const ext = extname(path).toLowerCase()
  return ext === '.yaml' || ext === '.yml'
}

async function loadDatabaseSync() {
  if (DatabaseSync) return DatabaseSync

  const originalEmitWarning = process.emitWarning
  process.emitWarning = function suppressSqliteExperimentalWarning(warning, ...args) {
    const name = warning?.name || (typeof args[0] === 'string' ? args[0] : args[0]?.type)
    const message = warning?.message || String(warning)
    if (name === 'ExperimentalWarning' && message.includes('SQLite')) return
    return originalEmitWarning.call(this, warning, ...args)
  }

  try {
    const sqlite = await import('node:sqlite')
    DatabaseSync = sqlite.DatabaseSync
    return DatabaseSync
  } finally {
    process.emitWarning = originalEmitWarning
  }
}

export function resolveConfigPaths(env = process.env, cwd = process.cwd()) {
  const configPath = resolve(cwd, env.SQLITE_PATH || env.CONFIG_PATH || DEFAULT_CONFIG_PATH)
  const legacyConfigPath = resolve(cwd, env.LEGACY_CONFIG_PATH || DEFAULT_LEGACY_CONFIG_PATH)
  const seedConfigPath = resolve(cwd, env.SEED_CONFIG_PATH || DEFAULT_SEED_CONFIG_PATH)

  return {
    configPath,
    legacyConfigPath,
    seedConfigPath,
    storageType: isYamlPath(configPath) ? 'yaml' : 'sqlite',
  }
}

function readYamlConfig(path) {
  const raw = readFileSync(path, 'utf-8')
  return yaml.load(raw)
}

function writeYamlConfig(path, config) {
  mkdirSync(dirname(path), { recursive: true })
  const text = yaml.dump(config, { lineWidth: -1, noRefs: true })
  writeFileSync(path, text, 'utf-8')
}

function loadSeedConfig(paths, includeLegacy = true) {
  const candidates = includeLegacy
    ? [paths.legacyConfigPath, paths.seedConfigPath]
    : [paths.seedConfigPath]
  const uniqueCandidates = [...new Set(candidates)]

  for (const candidate of uniqueCandidates) {
    if (!candidate || !existsSync(candidate)) continue
    return { config: readYamlConfig(candidate), source: candidate }
  }

  return null
}

function saveSqliteConfig(db, config) {
  db.prepare(`
    INSERT INTO app_config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(CONFIG_KEY, JSON.stringify(config))
}

function readSqliteConfig(db) {
  const row = db.prepare('SELECT value FROM app_config WHERE key = ?').get(CONFIG_KEY)
  if (!row) return null
  return JSON.parse(row.value)
}

async function createSqliteConfigStore(paths) {
  const SqliteDatabaseSync = await loadDatabaseSync()
  mkdirSync(dirname(paths.configPath), { recursive: true })

  const db = new SqliteDatabaseSync(paths.configPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  if (!readSqliteConfig(db)) {
    const seed = loadSeedConfig(paths)
    if (seed) {
      saveSqliteConfig(db, seed.config)
      console.log(`Seeded ${paths.configPath} from ${seed.source}`)
    }
  }

  return {
    type: 'sqlite',
    configPath: paths.configPath,
    getConfig() {
      const config = readSqliteConfig(db)
      if (!config) throw new Error('Config not found')
      return config
    },
    saveConfig(config) {
      saveSqliteConfig(db, config)
    },
    close() {
      db.close()
    },
  }
}

function createYamlConfigStore(paths) {
  if (!existsSync(paths.configPath)) {
    const seed = loadSeedConfig(paths, false)
    if (seed) {
      writeYamlConfig(paths.configPath, seed.config)
      console.log(`Seeded ${paths.configPath} from ${seed.source}`)
    }
  }

  return {
    type: 'yaml',
    configPath: paths.configPath,
    getConfig() {
      const config = readYamlConfig(paths.configPath)
      if (!config) throw new Error('Config not found')
      return config
    },
    saveConfig(config) {
      writeYamlConfig(paths.configPath, config)
    },
    close() {},
  }
}

export async function createConfigStore(paths = resolveConfigPaths()) {
  if (paths.storageType === 'yaml') return createYamlConfigStore(paths)
  return createSqliteConfigStore(paths)
}
