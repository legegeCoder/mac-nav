import { useState, useEffect, useCallback } from 'react'
import yaml from 'js-yaml'
import { getAuthToken, clearAuthToken } from './useAuth'
import type { NavConfig } from '../types/nav'

async function fetchRemoteConfig(): Promise<NavConfig | null> {
  try {
    const token = getAuthToken()
    const res = await fetch('/api/config', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 401) {
      clearAuthToken()
      window.location.reload()
      return null
    }
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
    const token = getAuthToken()
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(config),
    })
    if (res.status === 401) {
      clearAuthToken()
      window.location.reload()
    }
  } catch { /* ignore save errors */ }
}

export function useNavConfig() {
  const [config, setConfig] = useState<NavConfig | null>(null)

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
      if (!prev) return prev
      const next = updater(prev)
      saveRemoteConfig(next)
      return next
    })
  }, [])

  const resetConfig = useCallback(() => {
    fetchRemoteConfig().then((remote) => {
      if (remote) setConfig(remote)
    })
  }, [])

  const exportYaml = useCallback(() => {
    if (!config) return
    const text = yaml.dump(config, { lineWidth: -1, noRefs: true })
    const blob = new Blob([text], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    a.download = `nav_${ts}.yaml`
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
