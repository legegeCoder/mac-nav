import { useEffect, useState, useRef } from 'react'
import type { CardStyle, IconStyle } from '../../hooks/useSettings'
import type { NavConfig, NavLink, DockItem } from '../../types/nav'
import s from './SettingsPanel.module.css'

interface Props {
  open: boolean
  onClose: () => void
  cardStyle: CardStyle
  iconStyle: IconStyle
  linkTarget: 'new' | 'self'
  setCardStyle: (v: CardStyle) => void
  setIconStyle: (v: IconStyle) => void
  setLinkTarget: (v: 'new' | 'self') => void
  config: NavConfig
  updateConfig: (updater: (prev: NavConfig) => NavConfig) => void
  resetConfig: () => void
  exportYaml: () => void
  importYaml: (file: File) => void
}

type Tab = 'style' | 'content' | 'data'
type EditMode =
  | null
  | { type: 'link'; catIdx: number; linkIdx: number; link: NavLink }
  | { type: 'dock'; section: 'items' | 'utilities'; idx: number; item: DockItem }
  | { type: 'greeting'; name: string; subtitle: string }
  | { type: 'menuBar'; value: string }
  | { type: 'favicon'; value: string }
  | { type: 'newCategory'; title: string }
  | { type: 'renameCategory'; idx: number; title: string }
  | { type: 'confirmDelete'; action: () => void; message: string }

const cardOptions: { value: CardStyle; emoji: string; label: string }[] = [
  { value: 'default', emoji: '🪟', label: '默认' },
  { value: 'minimal', emoji: '✨', label: '极简' },
  { value: 'glass', emoji: '💎', label: '玻璃' },
  { value: 'neumorphic', emoji: '🎨', label: '新拟态' },
  { value: 'launchpad', emoji: '🚀', label: '启动台' },
]

const iconOptions: { value: IconStyle; emoji: string; label: string }[] = [
  { value: 'emoji', emoji: '😊', label: 'Emoji' },
  { value: 'outlined', emoji: '○', label: '线框' },
  { value: 'filled', emoji: '●', label: '填充' },
]

const emptyLink: NavLink = { name: '', url: '', emoji: '🔗', desc: '', faIcon: '', color: ['#007aff', '#5856d6'] }
const emptyDock: DockItem = { name: '', url: '', emoji: '🔗' }

export default function SettingsPanel({
  open, onClose, cardStyle, iconStyle, linkTarget, setCardStyle, setIconStyle, setLinkTarget,
  config, updateConfig, resetConfig, exportYaml, importYaml,
}: Props) {
  const [tab, setTab] = useState<Tab>('style')
  const [editing, setEditing] = useState<EditMode>(null)
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

  useEffect(() => { if (!open) setEditing(null) }, [open])

  // Listen for external edit requests from context menu
  useEffect(() => {
    const onEditLink = (e: Event) => {
      const { catIdx, linkIdx, link } = (e as CustomEvent).detail
      setTab('content')
      setEditing({ type: 'link', catIdx, linkIdx, link })
    }
    const onEditDock = (e: Event) => {
      const { section, idx, item } = (e as CustomEvent).detail
      setTab('content')
      setEditing({ type: 'dock', section, idx, item })
    }
    window.addEventListener('edit-link', onEditLink)
    window.addEventListener('edit-dock', onEditDock)
    return () => {
      window.removeEventListener('edit-link', onEditLink)
      window.removeEventListener('edit-dock', onEditDock)
    }
  }, [])

  const saveEditing = () => {
    if (!editing) return
    switch (editing.type) {
      case 'link': {
        const { catIdx, linkIdx, link } = editing
        if (!link.name || !link.url) return
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
        if (!item.name || !item.emoji) return
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
      title = editing.linkIdx === -1 ? '添加链接' : '编辑链接'
      content = (
        <div className={s.formGrid}>
          <input className={s.formInput} placeholder="名称" value={link.name} onChange={(e) => update({ name: e.target.value })} autoFocus />
          <input className={s.formInput} placeholder="网址 (https://...)" value={link.url} onChange={(e) => update({ url: e.target.value })} />
          <div className={s.formRow}>
            <input className={s.formInput} placeholder="Emoji" value={link.emoji} onChange={(e) => update({ emoji: e.target.value })} style={{ flex: '0 0 80px' }} />
            <input className={s.formInput} placeholder="描述" value={link.desc} onChange={(e) => update({ desc: e.target.value })} />
          </div>
          <input className={s.formInput} placeholder="FA 图标类名 (可选，如 fab fa-github)" value={link.faIcon || ''} onChange={(e) => update({ faIcon: e.target.value })} />
        </div>
      )
    } else if (editing.type === 'dock') {
      const { item } = editing
      const update = (patch: Partial<DockItem>) => setEditing({ ...editing, item: { ...item, ...patch } })
      title = editing.idx === -1 ? '添加 Dock 项' : '编辑 Dock 项'
      content = (
        <div className={s.formGrid}>
          <div className={s.formRow}>
            <input className={s.formInput} placeholder="Emoji" value={item.emoji} onChange={(e) => update({ emoji: e.target.value })} style={{ flex: '0 0 80px' }} autoFocus />
            <input className={s.formInput} placeholder="名称" value={item.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <input className={s.formInput} placeholder="网址" value={item.url || ''} onChange={(e) => update({ url: e.target.value })} />
        </div>
      )
    } else if (editing.type === 'greeting') {
      title = '编辑问候语'
      content = (
        <div className={s.formGrid}>
          <input className={s.formInput} placeholder="称呼" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
          <input className={s.formInput} placeholder="副标题" value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
        </div>
      )
    } else if (editing.type === 'menuBar') {
      title = '编辑菜单栏'
      content = (
        <>
          <div className={s.formGrid}>
            <input className={s.formInput} placeholder="菜单项（逗号分隔）" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} autoFocus />
          </div>
          <p className={s.formHint}>多个菜单项用逗号分隔，如：访达, 文件, 编辑</p>
        </>
      )
    } else if (editing.type === 'favicon') {
      title = '网站图标'
      content = (
        <>
          <div className={s.formGrid}>
            <input className={s.formInput} placeholder="图标 URL (https://...)" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} autoFocus />
          </div>
          <p className={s.formHint}>填写图标图片地址，留空则使用浏览器默认图标</p>
          {editing.value && <img src={editing.value} alt="favicon preview" style={{ width: 32, height: 32, marginTop: 8, objectFit: 'contain' }} />}
        </>
      )
    } else if (editing.type === 'newCategory' || editing.type === 'renameCategory') {
      title = editing.type === 'newCategory' ? '新建分类' : '重命名分类'
      content = (
        <div className={s.formGrid}>
          <input className={s.formInput} placeholder="分类名称" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} autoFocus />
        </div>
      )
    }

    return (
      <>
        <div className={s.editOverlay} onClick={() => setEditing(null)} />
        <div className={s.editModal}>
          <div className={s.editHeader}>
            <span className={s.editTitle}>{title}</span>
            <button className={s.editCloseBtn} onClick={() => setEditing(null)}>&times;</button>
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
          <h2 className={s.title}>⚙️ 设置</h2>
          <button className={s.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={s.tabs}>
          {([['style', '外观'], ['content', '内容'], ['data', '数据']] as [Tab, string][]).map(([key, label]) => (
            <button key={key} className={`${s.tab} ${tab === key ? s.tabActive : ''}`} onClick={() => { setTab(key); setEditing(null) }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'style' && (
          <>
            <div className={s.section}>
              <div className={s.label}>卡片样式</div>
              <div className={s.options}>
                {cardOptions.map((opt) => (
                  <div key={opt.value} className={`${s.option} ${cardStyle === opt.value ? s.optionActive : ''}`} onClick={() => setCardStyle(opt.value)}>
                    <div className={s.optionPreview}>{opt.emoji}</div>
                    <div className={s.optionName}>{opt.label}</div>
                  </div>
                ))}
              </div>
            </div>
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
              <div className={s.label}>链接打开方式</div>
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

        {tab === 'content' && (
          <>
            <div className={s.section}>
              <div className={s.label}>基本信息</div>
              <div className={s.infoRow}>
                <button className={s.infoBtn} onClick={() => setEditing({ type: 'greeting', name: config.greeting.name, subtitle: config.greeting.subtitle })}>
                  问候语：{config.greeting.name}
                </button>
                <button className={s.infoBtn} onClick={() => setEditing({ type: 'menuBar', value: config.menuBar.items.join(', ') })}>
                  菜单栏
                </button>
                <button className={s.infoBtn} onClick={() => setEditing({ type: 'favicon', value: config.favicon || '' })}>
                  网站图标
                </button>
              </div>
            </div>

            <div className={s.section}>
              <div className={s.labelRow}>
                <span className={s.label}>导航链接</span>
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
                      <span className={s.linkEmoji}>{link.emoji}</span>
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

            <div className={s.section}>
              <div className={s.labelRow}>
                <span className={s.label}>Dock 栏</span>
                <button className={s.addBtn} onClick={() => setEditing({ type: 'dock', section: 'items', idx: -1, item: { ...emptyDock } })}>+ 快捷</button>
              </div>
              {config.dock.items.map((item, idx) => (
                <div key={idx} className={s.linkItem}>
                  <span className={s.linkEmoji}>{item.emoji}</span>
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

        {tab === 'data' && (
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
        )}
      </div>

      {renderEditModal()}
    </>
  )
}
