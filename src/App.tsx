import {useCallback, useEffect, useRef, useState} from 'react'
import {useNavConfig} from './hooks/useNavConfig'
import type {IconStyle} from './hooks/useSettings'
import {useClock} from './hooks/useClock'
import {useAuth} from './hooks/useAuth'
import BgDecoration from './components/BgDecoration/BgDecoration'
import MenuBar from './components/MenuBar/MenuBar'
import Welcome from './components/Welcome/Welcome'
import SearchBar from './components/SearchBar/SearchBar'
import CategorySection from './components/CategorySection/CategorySection'
import Dock from './components/Dock/Dock'
import SettingsPanel from './components/SettingsPanel/SettingsPanel'
import type {MenuItem} from './components/ContextMenu/ContextMenu'
import ContextMenu from './components/ContextMenu/ContextMenu'
import LoginPage from './components/LoginPage/LoginPage'
import type {DockItem, NavLink} from './types/nav'
import './styles/global.css'

interface CtxState {
  x: number
  y: number
  items: MenuItem[]
}

export default function App() {
  const { config, updateConfig, resetConfig, exportYaml, importYaml, refetch, fetchGuest } = useNavConfig()
  const { greeting } = useClock()
  const { isLoggedIn, verifying, login, logout } = useAuth()

  const [showLoginModal, setShowLoginModal] = useState(false)

  // Fetch config based on login state after verification completes
  useEffect(() => {
    if (verifying) return
    if (isLoggedIn) refetch()
    else fetchGuest()
  }, [verifying, isLoggedIn, refetch, fetchGuest])

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ctx, setCtx] = useState<CtxState | null>(null)
  const [jiggleMode, setJiggleMode] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const iconStyle = (config?.settings?.iconStyle as IconStyle) || 'default'
  const linkTarget = config?.settings?.linkTarget || 'new'

  const setIconStyle = useCallback((v: IconStyle) => {
    updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, iconStyle: v } }))
  }, [updateConfig])

  // Dynamic favicon
  useEffect(() => {
    if (!config?.favicon) return
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = config.favicon
  }, [config?.favicon])
  const setLinkTarget = useCallback((v: 'new' | 'self') => {
    updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, linkTarget: v } }))
  }, [updateConfig])

  // Block native context menu globally (only when logged in)
  useEffect(() => {
    if (!isLoggedIn) return
    const handler = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [isLoggedIn])

  const closeCtx = useCallback(() => setCtx(null), [])

  // Drop link to dock
  const handleDropLink = useCallback((link: NavLink) => {
    updateConfig((prev) => {
      if (prev.dock.items.some((d) => d.url === link.url)) return prev
      return { ...prev, dock: { ...prev.dock, items: [...prev.dock.items, { name: link.name, url: link.url, emoji: '', icon: link.icon, iconText: link.iconText }] } }
    })
  }, [updateConfig])

  // Find which category/index a link belongs to
  const findLink = useCallback((link: NavLink) => {
    if (!config) return null
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

  // Rename category inline
  const handleRenameCategory = useCallback((catIdx: number, newTitle: string) => {
    updateConfig((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) => i === catIdx ? { ...c, title: newTitle } : c),
    }))
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

  // Jiggle mode: long-press to enter, click background to exit
  const handleMainMouseDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => { setJiggleMode(true); setCtx(null) }, 600)
  }, [])
  const handleMainMouseUp = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }, [])
  const handleMainClick = useCallback((e: React.MouseEvent) => {
    if (!jiggleMode) return
    // Only exit if clicking the background, not a card/badge
    if ((e.target as HTMLElement).closest('a, [class*="deleteBadge"], [class*="DeleteBadge"]')) return
    setJiggleMode(false)
  }, [jiggleMode])

  // Escape exits jiggle mode
  useEffect(() => {
    if (!jiggleMode) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setJiggleMode(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [jiggleMode])

  // Delete card (from jiggle mode)
  const handleDeleteCard = useCallback((catIdx: number, linkIdx: number) => {
    updateConfig((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i !== catIdx ? c : { ...c, links: c.links.filter((_, j) => j !== linkIdx) }
      ),
    }))
  }, [updateConfig])

  // Delete dock item (from jiggle mode)
  const handleDeleteDockItem = useCallback((idx: number) => {
    updateConfig((prev) => ({
      ...prev,
      dock: { ...prev.dock, items: prev.dock.items.filter((_, i) => i !== idx) },
    }))
  }, [updateConfig])

  // Login from modal: close modal after success
  const handleLoginFromModal = useCallback(async (password: string) => {
    const ok = await login(password)
    if (ok) setShowLoginModal(false)
    return ok
  }, [login])

  if (verifying) {
    return <BgDecoration />
  }

  if (!config) {
    return <BgDecoration />
  }

  return (
    <>
      <BgDecoration bgImage={config.settings?.bgImage} bgBlur={config.settings?.bgBlur} />
      <MenuBar
        items={config.menuBar.items}
        icon={config.favicon}
        isLoggedIn={isLoggedIn}
        onLogout={logout}
        onLoginClick={() => setShowLoginModal(true)}
      />

      <main
        style={{ position: 'relative', zIndex: 1, padding: '80px 40px 140px', maxWidth: 1400, margin: '0 auto' }}
        onMouseDown={isLoggedIn ? handleMainMouseDown : undefined}
        onMouseUp={isLoggedIn ? handleMainMouseUp : undefined}
        onMouseLeave={isLoggedIn ? handleMainMouseUp : undefined}
        onClick={isLoggedIn ? handleMainClick : undefined}
      >
        <Welcome
          greeting={greeting}
          name={config.greeting.name}
          subtitle={config.greeting.subtitle}
          showGreeting={config.settings?.showGreeting !== false}
          showSubtitle={config.settings?.showSubtitle !== false}
        />
        {config.settings?.showSearch !== false && <SearchBar isLaunchpad />}
        {config.categories.map((cat, catIdx) => (
          <CategorySection
            key={cat.title}
            category={cat}
            catIdx={catIdx}
            iconStyle={iconStyle}
            linkTarget={linkTarget}
            iconSize={config.settings?.iconSize}
            nameFontSize={config.settings?.nameFontSize}
            categoryFontSize={config.settings?.categoryFontSize}
            jiggle={isLoggedIn ? jiggleMode : false}
            onCardContextMenu={isLoggedIn ? handleCardContext : undefined}
            onReorderCard={isLoggedIn ? handleReorderCard : undefined}
            onRenameCategory={isLoggedIn ? handleRenameCategory : undefined}
            onDeleteCard={isLoggedIn ? handleDeleteCard : undefined}
          />
        ))}
      </main>

      <Dock
        items={config.dock.items}
        utilities={config.dock.utilities}
        linkTarget={linkTarget}
        jiggle={isLoggedIn ? jiggleMode : false}
        onSettingsClick={isLoggedIn ? () => setSettingsOpen(true) : undefined}
        onDropLink={isLoggedIn ? handleDropLink : undefined}
        onItemContextMenu={isLoggedIn ? handleDockContext : undefined}
        onReorderDock={isLoggedIn ? handleReorderDock : undefined}
        onDeleteDockItem={isLoggedIn ? handleDeleteDockItem : undefined}
      />

      {isLoggedIn && (
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          iconStyle={iconStyle}
          linkTarget={linkTarget}
          setIconStyle={setIconStyle}
          setLinkTarget={setLinkTarget}
          config={config}
          updateConfig={updateConfig}
          resetConfig={resetConfig}
          exportYaml={exportYaml}
          importYaml={importYaml}
        />
      )}

      {isLoggedIn && ctx && <ContextMenu x={ctx.x} y={ctx.y} items={ctx.items} onClose={closeCtx} />}

      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <LoginPage onLogin={handleLoginFromModal} avatar={config.avatar} name={config.greeting?.name} onClose={() => setShowLoginModal(false)} />
        </div>
      )}
    </>
  )
}
