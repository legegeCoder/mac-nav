import { useState, useEffect, useCallback } from 'react'
import yaml from 'js-yaml'
import defaultConfig from '../config/nav.yaml'
import type { NavConfig } from '../types/nav'

const STORAGE_KEY = 'navConfig'

function loadConfig(): NavConfig {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as NavConfig
    } catch { /* fall through */ }
  }
  return defaultConfig as unknown as NavConfig
}

export function useNavConfig() {
  const [config, setConfig] = useState<NavConfig>(loadConfig)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  const updateConfig = useCallback((updater: (prev: NavConfig) => NavConfig) => {
    setConfig((prev) => updater(prev))
  }, [])

  const resetConfig = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setConfig(defaultConfig as unknown as NavConfig)
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
        }
      } catch (e) {
        console.error('YAML 解析失败', e)
      }
    }
    reader.readAsText(file)
  }, [])

  return { config, updateConfig, resetConfig, exportYaml, importYaml }
}
