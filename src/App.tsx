import { useState, useCallback, useEffect } from 'react'
import { useNavConfig } from './hooks/useNavConfig'
import { useSettings } from './hooks/useSettings'
import { useClock } from './hooks/useClock'
import BgDecoration from './components/BgDecoration/BgDecoration'
import MenuBar from './components/MenuBar/MenuBar'
import Welcome from './components/Welcome/Welcome'
import SearchBar from './components/SearchBar/SearchBar'
import CategorySection from './components/CategorySection/CategorySection'
import Dock from './components/Dock/Dock'
import SettingsPanel from './components/SettingsPanel/SettingsPanel'
import ContextMenu from './components/ContextMenu/ContextMenu'
import type { MenuItem } from './components/ContextMenu/ContextMenu'
import type { NavLink, DockItem } from './types/nav'
import './styles/global.css'

interface CtxState {
  x: number
  y: number
  items: MenuItem[]
}

export default function App() {
  const { config, updateConfig, resetConfig, exportYaml, importYaml } = useNavConfig()
  const { cardStyle, setCardStyle, iconStyle, setIconStyle } = useSettings()
  const { greeting } = useClock()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ctx, setCtx] = useState<CtxState | null>(null)

  const linkTarget = config.settings?.linkTarget || 'new'

  // Dynamic favicon
  useEffect(() => {
    if (!config.favicon) return
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = config.favicon
  }, [config.favicon])
  const setLinkTarget = useCallback((v: 'new' | 'self') => {
    updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, linkTarget: v } }))
  }, [updateConfig])

  // Block native context menu globally
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  const closeCtx = useCallback(() => setCtx(null), [])

  // Drop link to dock
  const handleDropLink = useCallback((link: NavLink) => {
    updateConfig((prev) => {
      if (prev.dock.items.some((d) => d.url === link.url)) return prev
      return { ...prev, dock: { ...prev.dock, items: [...prev.dock.items, { name: link.name, url: link.url, emoji: link.emoji }] } }
    })
  }, [updateConfig])

  // Find which category/index a link belongs to
  const findLink = useCallback((link: NavLink) => {
    for (let ci = 0; ci < config.categories.length; ci++) {
      const li = config.categories[ci].links.findIndex((l) => l.url === link.url && l.name === link.name)
      if (li !== -1) return { catIdx: ci, linkIdx: li }
    }
    return null
  }, [config])

  // Right-click on a navigation card
  const handleCardContext = useCallback((e: React.MouseEvent, link: NavLink) => {
    const pos = findLink(link)
    const items: MenuItem[] = [
      {
        label: '添加到 Dock',
        icon: '📌',
        onClick: () => handleDropLink(link),
      },
      {
        label: '编辑链接',
        icon: '✏️',
        onClick: () => {
          if (!pos) return
          setSettingsOpen(true)
          // Small delay so settings panel opens first
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('edit-link', { detail: { catIdx: pos.catIdx, linkIdx: pos.linkIdx, link: { ...link } } }))
          }, 100)
        },
      },
      { label: '', icon: '', divider: true, onClick: () => {} },
      {
        label: '从分类中删除',
        icon: '🗑',
        danger: true,
        onClick: () => {
          if (!pos) return
          updateConfig((prev) => ({
            ...prev,
            categories: prev.categories.map((c, i) =>
              i !== pos.catIdx ? c : { ...c, links: c.links.filter((_, j) => j !== pos.linkIdx) }
            ),
          }))
        },
      },
    ]
    setCtx({ x: e.clientX, y: e.clientY, items })
  }, [findLink, handleDropLink, updateConfig])

  // Right-click on a dock item
  const handleDockContext = useCallback((e: React.MouseEvent, item: DockItem, idx: number) => {
    const items: MenuItem[] = [
      {
        label: '编辑',
        icon: '✏️',
        onClick: () => {
          setSettingsOpen(true)
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('edit-dock', { detail: { section: 'items', idx, item: { ...item } } }))
          }, 100)
        },
      },
      { label: '', icon: '', divider: true, onClick: () => {} },
      {
        label: '从 Dock 移除',
        icon: '🗑',
        danger: true,
        onClick: () => {
          updateConfig((prev) => ({
            ...prev,
            dock: { ...prev.dock, items: prev.dock.items.filter((_, i) => i !== idx) },
          }))
        },
      },
    ]
    setCtx({ x: e.clientX, y: e.clientY, items })
  }, [updateConfig])

  // Reorder cards across/within categories
  const handleReorderCard = useCallback((fromCat: number, fromIdx: number, toCat: number, toIdx: number) => {
    updateConfig((prev) => {
      const cats = prev.categories.map((c) => ({ ...c, links: [...c.links] }))
      const [moved] = cats[fromCat].links.splice(fromIdx, 1)
      cats[toCat].links.splice(toIdx, 0, moved)
      return { ...prev, categories: cats }
    })
  }, [updateConfig])

  // Reorder dock items
  const handleReorderDock = useCallback((fromIdx: number, toIdx: number) => {
    updateConfig((prev) => {
      const items = [...prev.dock.items]
      const [moved] = items.splice(fromIdx, 1)
      items.splice(toIdx, 0, moved)
      return { ...prev, dock: { ...prev.dock, items } }
    })
  }, [updateConfig])

  return (
    <>
      <BgDecoration />
      <MenuBar items={config.menuBar.items} />

      <main style={{ position: 'relative', zIndex: 1, padding: '80px 40px 140px', maxWidth: 1400, margin: '0 auto' }}>
        <Welcome
          greeting={greeting}
          name={config.greeting.name}
          subtitle={config.greeting.subtitle}
        />
        <SearchBar isLaunchpad={cardStyle === 'launchpad'} />
        {config.categories.map((cat, catIdx) => (
          <CategorySection
            key={cat.title}
            category={cat}
            catIdx={catIdx}
            cardStyle={cardStyle}
            iconStyle={iconStyle}
            linkTarget={linkTarget}
            onCardContextMenu={handleCardContext}
            onReorderCard={handleReorderCard}
          />
        ))}
      </main>

      <Dock
        items={config.dock.items}
        utilities={config.dock.utilities}
        linkTarget={linkTarget}
        onSettingsClick={() => setSettingsOpen(true)}
        onDropLink={handleDropLink}
        onItemContextMenu={handleDockContext}
        onReorderDock={handleReorderDock}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cardStyle={cardStyle}
        iconStyle={iconStyle}
        linkTarget={linkTarget}
        setCardStyle={setCardStyle}
        setIconStyle={setIconStyle}
        setLinkTarget={setLinkTarget}
        config={config}
        updateConfig={updateConfig}
        resetConfig={resetConfig}
        exportYaml={exportYaml}
        importYaml={importYaml}
      />

      {ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={closeCtx} />}
    </>
  )
}
