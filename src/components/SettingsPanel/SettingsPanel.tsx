import {useCallback, useEffect, useRef, useState} from 'react'
import type {IconStyle} from '../../hooks/useSettings'
import type {DockItem, NavConfig, NavLink} from '../../types/nav'
import s from './SettingsPanel.module.css'

interface Props {
  open: boolean
  onClose: () => void
  iconStyle: IconStyle
  linkTarget: 'new' | 'self'
  setIconStyle: (v: IconStyle) => void
  setLinkTarget: (v: 'new' | 'self') => void
  config: NavConfig
  updateConfig: (updater: (prev: NavConfig) => NavConfig) => void
  resetConfig: () => void
  exportYaml: () => void
  importYaml: (file: File) => void
}

type Section = 'profile' | 'appearance' | 'linkBehavior' | 'navLinks' | 'dock' | 'data'
type EditMode =
  | null
  | { type: 'link'; catIdx: number; linkIdx: number; link: NavLink }
  | { type: 'dock'; section: 'items' | 'utilities'; idx: number; item: DockItem }
  | { type: 'profile'; avatar: string; name: string; subtitle: string }
  | { type: 'greeting'; name: string; subtitle: string }
  | { type: 'menuBar'; value: string }
  | { type: 'favicon'; value: string }
  | { type: 'newCategory'; title: string }
  | { type: 'renameCategory'; idx: number; title: string }
  | { type: 'confirmDelete'; action: () => void; message: string }

const iconOptions: { value: IconStyle; emoji: string; label: string }[] = [
  { value: 'default', emoji: '🪟', label: '默认' },
  { value: 'outlined', emoji: '▢', label: '线框' },
  { value: 'filled', emoji: '▣', label: '填充' },
]

/** Extract short text from URL hostname, e.g. https://www.kimi.com/ -> kimi, max 8 chars */
function extractIconText(url: string): string {
  try {
    const host = new URL(url).hostname
    // strip www. prefix, take first domain segment
    const base = host.replace(/^www\./, '').split('.')[0]
    return base.slice(0, 8)
  } catch {
    return ''
  }
}

/** Try to fetch favicon.ico from a URL, returns the favicon URL or empty string on failure/timeout */
function fetchFavicon(url: string, timeout = 6000): Promise<string> {
  return new Promise((resolve) => {
    try {
      const origin = new URL(url).origin
      const faviconUrl = `${origin}/favicon.ico`
      const img = new Image()
      const timer = setTimeout(() => { img.src = ''; resolve('') }, timeout)
      img.onload = () => { clearTimeout(timer); resolve(faviconUrl) }
      img.onerror = () => { clearTimeout(timer); resolve('') }
      img.src = faviconUrl
    } catch {
      resolve('')
    }
  })
}

const emptyLink: NavLink = { name: '', url: '', desc: '', color: ['#007aff', '#5856d6'] }
const emptyDock: DockItem = { name: '', url: '', emoji: '🔗' }

function isValidUrl(str: string): boolean {
  try { return /^https?:\/\//i.test(new URL(str).href) } catch { return false }
}

export default function SettingsPanel({
  open, onClose, iconStyle, linkTarget, setIconStyle, setLinkTarget,
  config, updateConfig, resetConfig, exportYaml, importYaml,
}: Props) {
  const [section, setSection] = useState<Section>('appearance')
  const [editing, setEditing] = useState<EditMode>(null)
  const [fetchingIcon, setFetchingIcon] = useState(false)
  const [faviconError, setFaviconError] = useState(false)
  const [iconTextError, setIconTextError] = useState(false)
  const [iconModeOverride, setIconModeOverride] = useState<'favicon' | 'text' | null>(null)
  const [stashedIcon, setStashedIcon] = useState<string | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) setEditing(null)
        else if (open) onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, editing])

  useEffect(() => { if (!open) { setEditing(null); setFetchingIcon(false); setFaviconError(false); setIconTextError(false); setIconModeOverride(null); setStashedIcon(undefined); setSection('appearance') } }, [open])

  // Reset icon mode state when opening a new edit modal (not on field updates within the same modal)
  const editingId = editing ? `${editing.type}-${'linkIdx' in editing ? editing.linkIdx : 'idx' in editing ? editing.idx : ''}` : null
  useEffect(() => { setIconModeOverride(null); setStashedIcon(undefined); setFaviconError(false); setIconTextError(false) }, [editingId])

  // Listen for external edit requests from context menu
  useEffect(() => {
    const onEditLink = (e: Event) => {
      const { catIdx, linkIdx, link } = (e as CustomEvent).detail
      setSection('navLinks')
      setFetchingIcon(false)
      setEditing({ type: 'link', catIdx, linkIdx, link })
    }
    const onEditDock = (e: Event) => {
      const { section, idx, item } = (e as CustomEvent).detail
      setSection('dock')
      setFetchingIcon(false)
      setEditing({ type: 'dock', section, idx, item })
    }
    window.addEventListener('edit-link', onEditLink)
    window.addEventListener('edit-dock', onEditDock)
    return () => {
      window.removeEventListener('edit-link', onEditLink)
      window.removeEventListener('edit-dock', onEditDock)
    }
  }, [])

  // Manual fetch favicon for link editing
  const fetchLinkFavicon = useCallback(() => {
    if (!editing || editing.type !== 'link') return
    const url = editing.link.url
    if (!url) return
    const iconText = extractIconText(url)
    setFetchingIcon(true)
    fetchFavicon(url).then((icon) => {
      setFetchingIcon(false)
      setEditing((prev) => {
        if (!prev || prev.type !== 'link') return prev
        return { ...prev, link: { ...prev.link, icon: icon || prev.link.icon, iconText: iconText || undefined } }
      })
    })
  }, [editing])

  // Manual fetch favicon for dock editing
  const fetchDockFavicon = useCallback(() => {
    if (!editing || editing.type !== 'dock') return
    const url = editing.item.url
    if (!url) return
    const iconText = extractIconText(url)
    setFetchingIcon(true)
    fetchFavicon(url).then((icon) => {
      setFetchingIcon(false)
      setEditing((prev) => {
        if (!prev || prev.type !== 'dock') return prev
        return { ...prev, item: { ...prev.item, icon: icon || prev.item.icon, iconText: iconText || undefined } }
      })
    })
  }, [editing])

  const saveEditing = () => {
    if (!editing) return
    setFaviconError(false)
    setIconTextError(false)
    const inFaviconMode = iconModeOverride === 'favicon' || (iconModeOverride === null && editing.type === 'link' && !!editing.link.icon) || (iconModeOverride === null && editing.type === 'dock' && !!editing.item.icon)
    switch (editing.type) {
      case 'link': {
        const { catIdx, linkIdx, link } = editing
        if (!link.name || !link.url) return
        if (inFaviconMode) {
          if (!link.icon || !isValidUrl(link.icon)) { setFaviconError(true); return }
        } else {
          if (!link.iconText) { setIconTextError(true); return }
        }
        updateConfig((prev) => {
          const cats = prev.categories.map((c, i) => {
            if (i !== catIdx) return c
            const links = [...c.links]
            if (linkIdx === -1) links.push(link)
            else links[linkIdx] = link
            return { ...c, links }
          })
          return { ...prev, categories: cats }
        })
        break
      }
      case 'dock': {
        const { section, idx, item } = editing
        if (!item.name) return
        if (inFaviconMode) {
          if (!item.icon || !isValidUrl(item.icon)) { setFaviconError(true); return }
        } else {
          if (!item.iconText) { setIconTextError(true); return }
        }
        updateConfig((prev) => {
          const arr = [...prev.dock[section]]
          if (idx === -1) arr.push(item)
          else arr[idx] = item
          return { ...prev, dock: { ...prev.dock, [section]: arr } }
        })
        break
      }
      case 'greeting':
        if (!editing.name) return
        updateConfig((prev) => ({ ...prev, greeting: { name: editing.name, subtitle: editing.subtitle } }))
        break
      case 'profile':
        if (!editing.name) return
        updateConfig((prev) => ({ ...prev, avatar: editing.avatar || undefined, greeting: { name: editing.name, subtitle: editing.subtitle } }))
        break
      case 'menuBar':
        updateConfig((prev) => ({ ...prev, menuBar: { items: editing.value.split(',').map(s => s.trim()).filter(Boolean) } }))
        break
      case 'favicon':
        updateConfig((prev) => ({ ...prev, favicon: editing.value || undefined }))
        break
      case 'newCategory':
        if (!editing.title) return
        updateConfig((prev) => ({ ...prev, categories: [...prev.categories, { title: editing.title, links: [] }] }))
        break
      case 'renameCategory':
        if (!editing.title) return
        updateConfig((prev) => {
          const cats = [...prev.categories]
          cats[editing.idx] = { ...cats[editing.idx], title: editing.title }
          return { ...prev, categories: cats }
        })
        break
      case 'confirmDelete':
        editing.action()
        break
    }
    setEditing(null)
  }

  const deleteLink = (catIdx: number, linkIdx: number) => {
    setEditing({
      type: 'confirmDelete',
      message: `确定删除「${config.categories[catIdx].links[linkIdx].name}」？`,
      action: () => updateConfig((prev) => {
        const cats = prev.categories.map((c, i) => i !== catIdx ? c : { ...c, links: c.links.filter((_, j) => j !== linkIdx) })
        return { ...prev, categories: cats }
      }),
    })
  }

  const deleteCategory = (idx: number) => {
    setEditing({
      type: 'confirmDelete',
      message: `确定删除分类「${config.categories[idx].title}」及其所有链接？`,
      action: () => updateConfig((prev) => ({ ...prev, categories: prev.categories.filter((_, i) => i !== idx) })),
    })
  }

  const deleteDock = (section: 'items' | 'utilities', idx: number) => {
    setEditing({
      type: 'confirmDelete',
      message: `确定删除「${config.dock[section][idx].name}」？`,
      action: () => updateConfig((prev) => ({ ...prev, dock: { ...prev.dock, [section]: prev.dock[section].filter((_, i) => i !== idx) } })),
    })
  }

  const renderEditModal = () => {
    if (!editing) return null

    let title = ''
    let content: React.ReactNode = null
    let isDanger = false

    if (editing.type === 'confirmDelete') {
      title = '确认操作'
      isDanger = true
      content = <p className={s.confirmMsg}>{editing.message}</p>
    } else if (editing.type === 'link') {
      const { link } = editing
      const update = (patch: Partial<NavLink>) => setEditing({ ...editing, link: { ...link, ...patch } })
      const usesFavicon = iconModeOverride === 'favicon' || (iconModeOverride === null && !!link.icon && !fetchingIcon)
      title = editing.linkIdx === -1 ? '添加链接' : '编辑链接'
      content = (
        <div className={s.formGrid}>
          <div className={s.iconPreviewRow}>
            <div
              className={s.iconPreviewBox}
              style={!usesFavicon && !fetchingIcon && link.color ? { background: `linear-gradient(135deg, ${link.color[0]}, ${link.color[1]})` } : undefined}
            >
              {fetchingIcon ? (
                <span className={s.iconSpinner} />
              ) : usesFavicon ? (
                <img src={link.icon} alt="" className={s.iconPreviewImg} />
              ) : (
                <span className={`${s.iconPreviewText} ${s.iconPreviewTextColored}`} data-len={Math.min((link.iconText || extractIconText(link.url) || link.name.slice(0, 2) || '?').length, 8)}>{link.iconText || extractIconText(link.url) || link.name.slice(0, 2) || '?'}</span>
              )}
            </div>
            <div className={s.iconPreviewInfo}>
              <span className={s.iconPreviewLabel}>{fetchingIcon ? '正在获取图标...' : usesFavicon ? (link.icon && isValidUrl(link.icon) ? '已获取 Favicon' : '未获取 Favicon') : '文字图标'}</span>
              <span className={s.iconPreviewSub}>{usesFavicon ? (link.icon ? link.icon.split('/').slice(0, 3).join('/') : '请填写地址或点击获取') : (link.iconText || extractIconText(link.url) || '手动填写或获取')}</span>
            </div>
          </div>
          <div className={s.iconModeToggle}>
            <button className={`${s.iconModeBtn} ${usesFavicon ? s.iconModeBtnActive : ''}`} onClick={() => { if (!usesFavicon) { setIconModeOverride('favicon'); update({ icon: stashedIcon || link.icon || '' }); setFaviconError(false); setIconTextError(false) } }}>Favicon</button>
            <button className={`${s.iconModeBtn} ${!usesFavicon && !fetchingIcon ? s.iconModeBtnActive : ''}`} onClick={() => { if (usesFavicon) { setStashedIcon(link.icon); setIconModeOverride('text'); update({ icon: undefined }); setFaviconError(false); setIconTextError(false) } }}>文字图标</button>
          </div>
          {usesFavicon && (
            <>
              <span className={s.formLabel}>Favicon 地址</span>
              <div className={s.formInputRow}>
                <input className={`${s.formInput} ${faviconError ? s.formInputError : ''}`} placeholder="https://example.com/favicon.ico" value={link.icon || ''} onChange={(e) => { setFaviconError(false); update({ icon: e.target.value || undefined }) }} />
                <button className={s.fetchBtn} onClick={fetchLinkFavicon} disabled={fetchingIcon || !link.url}>获取</button>
              </div>
              {faviconError && <span className={s.formErrorHint}>请输入合法的图片地址</span>}
            </>
          )}
          {!usesFavicon && !fetchingIcon && (
            <>
              <span className={s.formLabel}>图标文字</span>
              <div className={s.formInputRow}>
                <input className={`${s.formInput} ${iconTextError ? s.formInputError : ''}`} placeholder="最多8字" maxLength={8} value={link.iconText || ''} onChange={(e) => { setIconTextError(false); update({ iconText: e.target.value || undefined }) }} />
                <button className={s.fetchBtn} onClick={() => {
                  if (!link.url) { setIconTextError(true); return }
                  const t = extractIconText(link.url)
                  if (t) { setIconTextError(false); update({ iconText: t }) } else { setIconTextError(true) }
                }}>提取</button>
              </div>
              {iconTextError && <span className={s.formErrorHint}>{!link.url ? '请先填写网址' : '图标文字不能为空'}</span>}
              <div className={s.colorRow}>
                <span className={s.colorLabel}>底色</span>
                <input type="color" className={s.colorInput} value={link.color?.[0] || '#007aff'} onChange={(e) => update({ color: [e.target.value, link.color?.[1] || '#5856d6'] })} />
                <input type="color" className={s.colorInput} value={link.color?.[1] || '#5856d6'} onChange={(e) => update({ color: [link.color?.[0] || '#007aff', e.target.value] })} />
              </div>
            </>
          )}
          <span className={s.formLabel}>名称</span>
          <input className={s.formInput} placeholder="链接名称" value={link.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
          <span className={s.formLabel}>网址</span>
          <input className={s.formInput} placeholder="https://..." value={link.url} onChange={(e) => update({ url: e.target.value })} />
          <span className={s.formLabel}>描述</span>
          <input className={s.formInput} placeholder="简短描述（可选）" value={link.desc} onChange={(e) => update({ desc: e.target.value })} />
        </div>
      )
    } else if (editing.type === 'dock') {
      const { item } = editing
      const update = (patch: Partial<DockItem>) => setEditing({ ...editing, item: { ...item, ...patch } })
      const usesFavicon = iconModeOverride === 'favicon' || (iconModeOverride === null && !!item.icon && !fetchingIcon)
      title = editing.idx === -1 ? '添加 Dock 项' : '编辑 Dock 项'
      content = (
        <div className={s.formGrid}>
          <div className={s.iconPreviewRow}>
            <div className={s.iconPreviewBox}>
              {fetchingIcon ? (
                <span className={s.iconSpinner} />
              ) : usesFavicon ? (
                <img src={item.icon} alt="" className={s.iconPreviewImg} />
              ) : (
                <span className={s.iconPreviewText} data-len={Math.min((item.iconText || extractIconText(item.url || '') || item.emoji || '?').length, 8)}>{item.iconText || extractIconText(item.url || '') || item.emoji || '?'}</span>
              )}
            </div>
            <div className={s.iconPreviewInfo}>
              <span className={s.iconPreviewLabel}>{fetchingIcon ? '正在获取图标...' : usesFavicon ? (item.icon && isValidUrl(item.icon) ? '已获取 Favicon' : '未获取 Favicon') : '文字图标'}</span>
              <span className={s.iconPreviewSub}>{usesFavicon ? (item.icon ? item.icon.split('/').slice(0, 3).join('/') : '请填写地址或点击获取') : (item.iconText || '手动填写或获取')}</span>
            </div>
          </div>
          <div className={s.iconModeToggle}>
            <button className={`${s.iconModeBtn} ${usesFavicon ? s.iconModeBtnActive : ''}`} onClick={() => { if (!usesFavicon) { setIconModeOverride('favicon'); update({ icon: stashedIcon || item.icon || '' }); setFaviconError(false); setIconTextError(false) } }}>Favicon</button>
            <button className={`${s.iconModeBtn} ${!usesFavicon && !fetchingIcon ? s.iconModeBtnActive : ''}`} onClick={() => { if (usesFavicon) { setStashedIcon(item.icon); setIconModeOverride('text'); update({ icon: undefined }); setFaviconError(false); setIconTextError(false) } }}>文字图标</button>
          </div>
          {usesFavicon && (
            <>
              <span className={s.formLabel}>Favicon 地址</span>
              <div className={s.formInputRow}>
                <input className={`${s.formInput} ${faviconError ? s.formInputError : ''}`} placeholder="https://example.com/favicon.ico" value={item.icon || ''} onChange={(e) => { setFaviconError(false); update({ icon: e.target.value || undefined }) }} />
                <button className={s.fetchBtn} onClick={fetchDockFavicon} disabled={fetchingIcon || !item.url}>获取</button>
              </div>
              {faviconError && <span className={s.formErrorHint}>请输入合法的图片地址</span>}
            </>
          )}
          {!usesFavicon && !fetchingIcon && (
            <>
              <span className={s.formLabel}>图标文字</span>
              <div className={s.formInputRow}>
                <input className={`${s.formInput} ${iconTextError ? s.formInputError : ''}`} placeholder="最多8字" maxLength={8} value={item.iconText || ''} onChange={(e) => { setIconTextError(false); update({ iconText: e.target.value || undefined }) }} />
                <button className={s.fetchBtn} onClick={() => {
                  if (!item.url) { setIconTextError(true); return }
                  const t = extractIconText(item.url)
                  if (t) { setIconTextError(false); update({ iconText: t }) } else { setIconTextError(true) }
                }}>提取</button>
              </div>
              {iconTextError && <span className={s.formErrorHint}>{!item.url ? '请先填写网址' : '图标文字不能为空'}</span>}
            </>
          )}
          <span className={s.formLabel}>名称</span>
          <input className={s.formInput} placeholder="Dock 项名称" value={item.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
          <span className={s.formLabel}>网址</span>
          <input className={s.formInput} placeholder="https://..." value={item.url || ''} onChange={(e) => update({ url: e.target.value })} />
        </div>
      )
    } else if (editing.type === 'greeting') {
      title = '编辑问候语'
      content = (
        <div className={s.formGrid}>
          <span className={s.formLabel}>称呼</span>
          <input className={s.formInput} placeholder="你的名字" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          <span className={s.formLabel}>副标题</span>
          <input className={s.formInput} placeholder="一句话介绍" value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
        </div>
      )
    } else if (editing.type === 'profile') {
      title = '编辑个人资料'
      content = (
        <div className={s.formGrid}>
          <span className={s.formLabel}>头像地址</span>
          <input className={s.formInput} placeholder="https://..." value={editing.avatar} onChange={(e) => setEditing({ ...editing, avatar: e.target.value })} />
          <span className={s.formLabel}>称呼</span>
          <input className={s.formInput} placeholder="你的名字" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          <span className={s.formLabel}>副标题</span>
          <input className={s.formInput} placeholder="一句话介绍" value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
        </div>
      )
    } else if (editing.type === 'menuBar') {
      title = '编辑菜单栏'
      content = (
        <>
          <div className={s.formGrid}>
            <span className={s.formLabel}>菜单项</span>
            <input className={s.formInput} placeholder="逗号分隔，如：访达, 文件, 编辑" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} autoFocus />
          </div>
          <p className={s.formHint}>多个菜单项用逗号分隔</p>
        </>
      )
    } else if (editing.type === 'favicon') {
      title = '网站图标'
      content = (
        <>
          <div className={s.formGrid}>
            <span className={s.formLabel}>图标地址</span>
            <input className={s.formInput} placeholder="https://..." value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} autoFocus />
          </div>
          <p className={s.formHint}>填写图标图片地址，留空则使用浏览器默认图标</p>
          {editing.value && <div style={{ textAlign: 'center', padding: '8px 0' }}><img src={editing.value} alt="favicon preview" style={{ width: 32, height: 32, objectFit: 'contain' }} /></div>}
        </>
      )
    } else if (editing.type === 'newCategory' || editing.type === 'renameCategory') {
      title = editing.type === 'newCategory' ? '新建分类' : '重命名分类'
      content = (
        <div className={s.formGrid}>
          <span className={s.formLabel}>分类名称</span>
          <input className={s.formInput} placeholder="输入分类名称" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus />
        </div>
      )
    }

    return (
      <>
        <div className={s.editOverlay} onClick={() => setEditing(null)} />
        <div className={s.editModal}>
          <div className={s.editHeader}>
            <div className={s.trafficLights}>
              <button className={s.trafficClose} onClick={() => setEditing(null)} />
              <span className={s.trafficMinimize} />
              <span className={s.trafficMaximize} />
            </div>
            <span className={s.editTitle}>{title}</span>
            <div className={s.trafficSpacer} />
          </div>
          {content}
          <div className={s.editActions}>
            <button className={s.cancelBtn} onClick={() => setEditing(null)}>取消</button>
            <button className={`${s.saveBtn} ${isDanger ? s.dangerSaveBtn : ''}`} onClick={saveEditing}>
              {isDanger ? '确定删除' : '保存'}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={`${s.overlay} ${open ? s.active : ''}`} onClick={onClose} />
      <div className={`${s.panel} ${open ? s.active : ''}`}>
        <div className={s.header}>
          <div className={s.headerTraffic}>
            <button className={s.headerClose} onClick={onClose} />
            <span className={s.headerYellow} />
            <span className={s.headerGreen} />
          </div>
          <span className={s.title}>设置</span>
          <div className={s.headerSpacer} />
        </div>

        <div className={s.settingsBody}>
          <div className={s.sidebar}>
            <button className={`${s.profileCard} ${section === 'profile' ? s.profileCardActive : ''}`} onClick={() => { setSection('profile'); setEditing(null) }}>
              <div className={s.profileAvatar}>
                {config.avatar ? <img src={config.avatar} alt="" className={s.profileAvatarImg} /> : config.greeting.name.slice(0, 1) || '?'}
              </div>
              <div className={s.profileInfo}>
                <span className={s.profileName}>{config.greeting.name || '未设置'}</span>
                <span className={s.profileSub}>{config.greeting.subtitle || '个人资料'}</span>
              </div>
            </button>
            <div className={s.sidebarDivider} />
            {([
              ['appearance', '🎨', '外观'],
              ['linkBehavior', '🔗', '链接打开方式'],
            ] as [Section, string, string][]).map(([key, icon, label]) => (
              <button key={key} className={`${s.sidebarItem} ${section === key ? s.sidebarItemActive : ''}`} onClick={() => { setSection(key); setEditing(null) }}>
                <span className={s.sidebarIcon}>{icon}</span>{label}
              </button>
            ))}
            <div className={s.sidebarDivider} />
            {([
              ['navLinks', '📂', '导航链接'],
              ['dock', '⚓', 'Dock 栏'],
            ] as [Section, string, string][]).map(([key, icon, label]) => (
              <button key={key} className={`${s.sidebarItem} ${section === key ? s.sidebarItemActive : ''}`} onClick={() => { setSection(key); setEditing(null) }}>
                <span className={s.sidebarIcon}>{icon}</span>{label}
              </button>
            ))}
            <div className={s.sidebarDivider} />
            <button className={`${s.sidebarItem} ${section === 'data' ? s.sidebarItemActive : ''}`} onClick={() => { setSection('data'); setEditing(null) }}>
              <span className={s.sidebarIcon}>💾</span>数据管理
            </button>
          </div>

          <div className={s.content}>
            {section === 'profile' && (
              <>
                <div className={s.sectionTitle}>个人资料</div>
                <div className={s.profileDisplay}>
                  <div className={s.profileDisplayAvatar}>
                    {config.avatar ? <img src={config.avatar} alt="" className={s.profileDisplayAvatarImg} /> : config.greeting.name.slice(0, 1) || '?'}
                  </div>
                  <div className={s.profileDisplayName}>{config.greeting.name || '未设置'}</div>
                  <div className={s.profileDisplaySub}>{config.greeting.subtitle}</div>
                  <button className={s.addBtn} onClick={() => setEditing({ type: 'profile', avatar: config.avatar || '', name: config.greeting.name, subtitle: config.greeting.subtitle })}>编辑资料</button>
                </div>
                <div className={s.section}>
                  <div className={s.label}>其他设置</div>
                  <div className={s.infoRow}>
                    <button className={s.infoBtn} onClick={() => setEditing({ type: 'menuBar', value: config.menuBar.items.join(', ') })}>
                      菜单栏
                    </button>
                    <button className={s.infoBtn} onClick={() => setEditing({ type: 'favicon', value: config.favicon || '' })}>
                      网站图标
                    </button>
                  </div>
                </div>
              </>
            )}

            {section === 'appearance' && (
              <>
                <div className={s.sectionTitle}>外观</div>
                <div className={s.section}>
                  <div className={s.label}>图标风格</div>
                  <div className={`${s.options} ${s.options3}`}>
                    {iconOptions.map((opt) => (
                      <div key={opt.value} className={`${s.option} ${iconStyle === opt.value ? s.optionActive : ''}`} onClick={() => setIconStyle(opt.value)}>
                        <div className={s.optionPreview}>{opt.emoji}</div>
                        <div className={s.optionName}>{opt.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={s.section}>
                  <div className={s.label}>分类字号（{config.settings?.categoryFontSize || 22}px）</div>
                  <input type="range" className={s.rangeInput} min={12} max={40} value={config.settings?.categoryFontSize || 22} onChange={(e) => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, categoryFontSize: Number(e.target.value) } }))} />
                </div>
                <div className={s.section}>
                  <div className={s.label}>图标大小（{config.settings?.iconSize || 56}px）</div>
                  <input type="range" className={s.rangeInput} min={24} max={120} value={config.settings?.iconSize || 56} onChange={(e) => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, iconSize: Number(e.target.value) } }))} />
                </div>
                <div className={s.section}>
                  <div className={s.label}>名称字号（{config.settings?.nameFontSize || 17}px）</div>
                  <input type="range" className={s.rangeInput} min={10} max={32} value={config.settings?.nameFontSize || 17} onChange={(e) => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, nameFontSize: Number(e.target.value) } }))} />
                </div>
                <div className={s.section}>
                  <div className={s.label}>称呼</div>
                  <div className={`${s.options} ${s.options2}`}>
                    <div className={`${s.option} ${config.settings?.showGreeting !== false ? s.optionActive : ''}`} onClick={() => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, showGreeting: true } }))}>
                      <div className={s.optionPreview}>👋</div>
                      <div className={s.optionName}>显示</div>
                    </div>
                    <div className={`${s.option} ${config.settings?.showGreeting === false ? s.optionActive : ''}`} onClick={() => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, showGreeting: false } }))}>
                      <div className={s.optionPreview}>🚫</div>
                      <div className={s.optionName}>隐藏</div>
                    </div>
                  </div>
                </div>
                <div className={s.section}>
                  <div className={s.label}>副标题</div>
                  <div className={`${s.options} ${s.options2}`}>
                    <div className={`${s.option} ${config.settings?.showSubtitle !== false ? s.optionActive : ''}`} onClick={() => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, showSubtitle: true } }))}>
                      <div className={s.optionPreview}>💬</div>
                      <div className={s.optionName}>显示</div>
                    </div>
                    <div className={`${s.option} ${config.settings?.showSubtitle === false ? s.optionActive : ''}`} onClick={() => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, showSubtitle: false } }))}>
                      <div className={s.optionPreview}>🚫</div>
                      <div className={s.optionName}>隐藏</div>
                    </div>
                  </div>
                </div>
                <div className={s.section}>
                  <div className={s.label}>搜索框</div>
                  <div className={`${s.options} ${s.options2}`}>
                    <div className={`${s.option} ${config.settings?.showSearch !== false ? s.optionActive : ''}`} onClick={() => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, showSearch: true } }))}>
                      <div className={s.optionPreview}>🔍</div>
                      <div className={s.optionName}>显示</div>
                    </div>
                    <div className={`${s.option} ${config.settings?.showSearch === false ? s.optionActive : ''}`} onClick={() => updateConfig((prev) => ({ ...prev, settings: { ...prev.settings, showSearch: false } }))}>
                      <div className={s.optionPreview}>🚫</div>
                      <div className={s.optionName}>隐藏</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'linkBehavior' && (
              <>
                <div className={s.sectionTitle}>链接打开方式</div>
                <div className={s.section}>
                  <div className={`${s.options} ${s.options2}`}>
                    <div className={`${s.option} ${linkTarget === 'new' ? s.optionActive : ''}`} onClick={() => setLinkTarget('new')}>
                      <div className={s.optionPreview}>🔗</div>
                      <div className={s.optionName}>新标签页</div>
                    </div>
                    <div className={`${s.option} ${linkTarget === 'self' ? s.optionActive : ''}`} onClick={() => setLinkTarget('self')}>
                      <div className={s.optionPreview}>📄</div>
                      <div className={s.optionName}>当前页面</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'navLinks' && (
              <>
                <div className={s.sectionTitle}>导航链接</div>
                <div className={s.section}>
                  <div className={s.labelRow}>
                    <span className={s.label}>分类管理</span>
                    <button className={s.addBtn} onClick={() => setEditing({ type: 'newCategory', title: '' })}>+ 分类</button>
                  </div>
                  {config.categories.map((cat, catIdx) => (
                    <div key={catIdx} className={s.catBlock}>
                      <div className={s.catHeader}>
                        <span className={s.catTitle}>{cat.title}</span>
                        <div className={s.catActions}>
                          <button className={s.smallBtn} onClick={() => setEditing({ type: 'renameCategory', idx: catIdx, title: cat.title })}>改名</button>
                          <button className={s.smallBtn} onClick={() => setEditing({ type: 'link', catIdx, linkIdx: -1, link: { ...emptyLink } })}>+ 链接</button>
                          <button className={`${s.smallBtn} ${s.dangerBtn}`} onClick={() => deleteCategory(catIdx)}>删除</button>
                        </div>
                      </div>
                      {cat.links.map((link, linkIdx) => (
                        <div key={linkIdx} className={s.linkItem}>
                          <span className={s.linkIcon}>
                            {link.icon ? <img src={link.icon} alt="" className={s.linkIconImg} /> : (link.iconText || link.name.slice(0, 2))}
                          </span>
                          <span className={s.linkName}>{link.name}</span>
                          <div className={s.linkActions}>
                            <button className={s.tinyBtn} onClick={() => setEditing({ type: 'link', catIdx, linkIdx, link: { ...link } })}>编辑</button>
                            <button className={`${s.tinyBtn} ${s.dangerBtn}`} onClick={() => deleteLink(catIdx, linkIdx)}>删除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === 'dock' && (
              <>
                <div className={s.sectionTitle}>Dock 栏</div>
                <div className={s.section}>
                  <div className={s.labelRow}>
                    <span className={s.label}>快捷项</span>
                    <button className={s.addBtn} onClick={() => setEditing({ type: 'dock', section: 'items', idx: -1, item: { ...emptyDock } })}>+ 快捷</button>
                  </div>
                  {config.dock.items.map((item, idx) => (
                    <div key={idx} className={s.linkItem}>
                      <span className={s.linkIcon}>
                        {item.icon ? <img src={item.icon} alt="" className={s.linkIconImg} /> : (item.iconText || item.emoji)}
                      </span>
                      <span className={s.linkName}>{item.name}</span>
                      <div className={s.linkActions}>
                        <button className={s.tinyBtn} onClick={() => setEditing({ type: 'dock', section: 'items', idx, item: { ...item } })}>编辑</button>
                        <button className={`${s.tinyBtn} ${s.dangerBtn}`} onClick={() => deleteDock('items', idx)}>删除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === 'data' && (
              <>
                <div className={s.sectionTitle}>数据管理</div>
                <div className={s.section}>
                  <div className={s.label}>配置管理</div>
                  <div className={s.dataActions}>
                    <button className={s.dataBtn} onClick={exportYaml}>📤 导出 YAML</button>
                    <button className={s.dataBtn} onClick={() => fileRef.current?.click()}>📥 导入 YAML</button>
                    <button className={`${s.dataBtn} ${s.dangerBtn}`} onClick={() => setEditing({ type: 'confirmDelete', message: '确定恢复默认配置？当前配置将丢失。', action: resetConfig })}>🔄 恢复默认</button>
                  </div>
                  <input ref={fileRef} type="file" accept=".yaml,.yml" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) { importYaml(e.target.files[0]); e.target.value = '' } }} />
                  <p className={s.dataTip}>导出后可手动编辑 YAML 文件，再导入恢复配置</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {renderEditModal()}
    </>
  )
}
