import { useState, useEffect, useCallback } from 'react'
import yaml from 'js-yaml'
import defaultConfig from '../config/nav.yaml'
import type { NavConfig } from '../types/nav'

async function fetchRemoteConfig(): Promise<NavConfig | null> {
  try {
    const res = await fetch('/api/config')
    if (!res.ok) return null
    const data = await res.json()
    if (data?.categories && data?.dock) return data as NavConfig
    return null
  } catch {
    return null
  }
}

async function saveRemoteConfig(config: NavConfig): Promise<void> {
  try {
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  } catch { /* ignore save errors */ }
}

export function useNavConfig() {
  const [config, setConfig] = useState<NavConfig>(defaultConfig as unknown as NavConfig)

  useEffect(() => {
    let cancelled = false
    fetchRemoteConfig().then((remote) => {
      if (cancelled || !remote) return
      setConfig(remote)
    })
    return () => { cancelled = true }
  }, [])

  const updateConfig = useCallback((updater: (prev: NavConfig) => NavConfig) => {
    setConfig((prev) => {
      const next = updater(prev)
      saveRemoteConfig(next)
      return next
    })
  }, [])

  const resetConfig = useCallback(() => {
    fetchRemoteConfig().then((remote) => {
      setConfig(remote ?? (defaultConfig as unknown as NavConfig))
    })
  }, [])

  const exportYaml = useCallback(() => {
    const text = yaml.dump(config, { lineWidth: -1, noRefs: true })
    const blob = new Blob([text], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nav.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }, [config])

  const importYaml = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = yaml.load(reader.result as string) as NavConfig
        if (parsed?.categories && parsed?.dock) {
          setConfig(parsed)
          saveRemoteConfig(parsed)
        }
      } catch (e) {
        console.error('YAML 解析失败', e)
      }
    }
    reader.readAsText(file)
  }, [])

  return { config, updateConfig, resetConfig, exportYaml, importYaml }
}
