import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import yaml from 'js-yaml'

import { createConfigStore, resolveConfigPaths } from './server-config-store.js'

function makeConfig(name = 'Seed User') {
  return {
    greeting: { name, subtitle: 'Where to?' },
    menuBar: { items: ['Finder'] },
    settings: { showSearch: true },
    categories: [
      {
        title: 'Public',
        public: true,
        links: [{ name: 'Docs', url: 'https://example.com', public: true }],
      },
    ],
    dock: { items: [], utilities: [] },
  }
}

async function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'nav-app-store-'))
  try {
    return await fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('defaults to SQLite storage under user-data', () => {
  const paths = resolveConfigPaths({}, '/app')

  assert.equal(paths.storageType, 'sqlite')
  assert.equal(paths.configPath, '/app/user-data/nav.sqlite')
  assert.equal(paths.legacyConfigPath, '/app/user-data/nav.yaml')
})

test('seeds a missing SQLite database from the legacy YAML config first', async () => {
  await withTempDir(async (dir) => {
    const userData = join(dir, 'user-data')
    const dist = join(dir, 'dist')
    mkdirSync(userData, { recursive: true })
    mkdirSync(dist, { recursive: true })

    writeFileSync(join(userData, 'nav.yaml'), yaml.dump(makeConfig('Legacy User')), 'utf-8')
    writeFileSync(join(dist, 'nav.yaml'), yaml.dump(makeConfig('Seed User')), 'utf-8')

    const store = await createConfigStore(resolveConfigPaths({}, dir))
    try {
      assert.equal(store.type, 'sqlite')
      assert.equal(store.getConfig().greeting.name, 'Legacy User')

      store.saveConfig(makeConfig('Saved User'))
      assert.equal(store.getConfig().greeting.name, 'Saved User')
    } finally {
      store.close()
    }

    const databaseBytes = readFileSync(join(userData, 'nav.sqlite'))
    assert.equal(databaseBytes.subarray(0, 16).toString(), 'SQLite format 3\u0000')
  })
})

test('keeps YAML storage when CONFIG_PATH explicitly points to a YAML file', async () => {
  await withTempDir(async (dir) => {
    const configPath = join(dir, 'custom.yml')
    writeFileSync(configPath, yaml.dump(makeConfig('Yaml User')), 'utf-8')

    const store = await createConfigStore(resolveConfigPaths({ CONFIG_PATH: configPath }, dir))
    assert.equal(store.type, 'yaml')
    assert.equal(store.getConfig().greeting.name, 'Yaml User')

    store.saveConfig(makeConfig('Updated Yaml User'))
    assert.equal(yaml.load(readFileSync(configPath, 'utf-8')).greeting.name, 'Updated Yaml User')
  })
})
