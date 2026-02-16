import {useMemo, useState} from 'react'
import type {DockItem, NavLink} from '../../types/nav'
import s from './Dock.module.css'

interface Props {
  items: DockItem[]
  utilities: DockItem[]
  linkTarget: 'new' | 'self'
  jiggle?: boolean
  onSettingsClick: () => void
  onDropLink: (link: NavLink) => void
  onItemContextMenu?: (e: React.MouseEvent, item: DockItem, idx: number) => void
  onReorderDock?: (fromIdx: number, toIdx: number) => void
  onDeleteDockItem?: (idx: number) => void
}

function DockIcon({ item }: { item: DockItem }) {
  const [err, setErr] = useState(false)
  if (item.icon && !err) {
    return <img src={item.icon} alt="" className={s.faviconImg} onError={() => setErr(true)} />
  }
  if (item.iconText) {
    return <span className={s.iconText} data-len={Math.min(item.iconText.length, 8)}>{item.iconText}</span>
  }
  return <>{item.emoji}</>
}

function JiggleVars() {
  return useMemo(() => {
    const a = -(1.5 + Math.random() * 1.5)
    const b = 1.5 + Math.random() * 1.5
    const delay = Math.random() * 0.2
    return { '--jiggle-a': `${a}deg`, '--jiggle-b': `${b}deg`, animationDelay: `${delay}s` } as React.CSSProperties
  }, [])
}

export default function Dock({ items, utilities, linkTarget, jiggle, onSettingsClick, onDropLink, onItemContextMenu, onReorderDock, onDeleteDockItem }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleClick = (item: DockItem, e: React.MouseEvent) => {
    if (jiggle) { e.preventDefault(); return }
    if (item.action === 'settings') {
      e.preventDefault()
      onSettingsClick()
    }
  }

  const onDockDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/nav-link') && !e.dataTransfer.types.includes('application/dock-reorder')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    }
  }

  const onDockDragLeave = () => setDragOver(false)

  const onDockDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.types.includes('application/dock-reorder')) return
    const raw = e.dataTransfer.getData('application/nav-link')
    if (!raw) return
    try {
      const link = JSON.parse(raw) as NavLink
      onDropLink(link)
    } catch { /* ignore */ }
  }

  // Dock item drag reorder
  const onItemDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('application/dock-reorder', String(idx))
    e.dataTransfer.effectAllowed = 'move'
    ;(e.target as HTMLElement).style.opacity = '0.4'
  }

  const onItemDragEnd = (e: React.DragEvent) => {
    ;(e.target as HTMLElement).style.opacity = ''
    setDragOverIdx(null)
  }

  const onItemDragOver = (e: React.DragEvent, idx: number) => {
    if (e.dataTransfer.types.includes('application/dock-reorder')) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      setDragOverIdx(idx)
    }
  }

  const onItemDragLeave = () => setDragOverIdx(null)

  const onItemDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIdx(null)
    const raw = e.dataTransfer.getData('application/dock-reorder')
    if (raw === '') return
    const fromIdx = Number(raw)
    if (fromIdx === toIdx) return
    onReorderDock?.(fromIdx, toIdx)
  }

  const handleItemContext = (e: React.MouseEvent, item: DockItem, idx: number) => {
    e.preventDefault()
    e.stopPropagation()
    onItemContextMenu?.(e, item, idx)
  }

  return (
    <div className={s.container}>
      <div
        className={`${s.dock} ${dragOver ? s.dockDragOver : ''}`}
        onDragOver={onDockDragOver}
        onDragLeave={onDockDragLeave}
        onDrop={onDockDrop}
      >
        {items.map((item, idx) => (
          <DockItemEl
            key={`${idx}-${item.name}`}
            item={item}
            idx={idx}
            linkTarget={linkTarget}
            jiggle={jiggle}
            dragOverIdx={dragOverIdx}
            onDragStart={onItemDragStart}
            onDragEnd={onItemDragEnd}
            onDragOver={onItemDragOver}
            onDragLeave={onItemDragLeave}
            onDrop={onItemDrop}
            onContextMenu={handleItemContext}
            onClick={(e) => handleClick(item, e)}
            onDelete={() => onDeleteDockItem?.(idx)}
          />
        ))}
        <div className={s.divider} />
        {utilities.map((item) => (
          <a
            key={item.name}
            href={item.url || '#'}
            className={s.item}
            onClick={(e) => handleClick(item, e)}
          >
            <span className={s.label}>{item.name}</span>
            <div className={s.icon}><DockIcon item={item} /></div>
          </a>
        ))}
      </div>
    </div>
  )
}

function DockItemEl({ item, idx, linkTarget, jiggle, dragOverIdx, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onContextMenu, onClick, onDelete }: {
  item: DockItem; idx: number; linkTarget: 'new' | 'self'; jiggle?: boolean; dragOverIdx: number | null
  onDragStart: (e: React.DragEvent, idx: number) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, idx: number) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, idx: number) => void
  onContextMenu: (e: React.MouseEvent, item: DockItem, idx: number) => void
  onClick: (e: React.MouseEvent) => void
  onDelete: () => void
}) {
  const jiggleVars = JiggleVars()

  return (
    <a
      href={item.url}
      target={linkTarget === 'new' ? '_blank' : '_self'}
      rel={linkTarget === 'new' ? 'noopener noreferrer' : undefined}
      className={`${s.item} ${dragOverIdx === idx ? s.itemDropTarget : ''} ${jiggle ? s.jiggleItem : ''}`}
      style={jiggle ? jiggleVars : undefined}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, idx)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, idx)}
      onContextMenu={(e) => onContextMenu(e, item, idx)}
      onClick={onClick}
    >
      <span className={s.label}>{item.name}</span>
      <div className={s.icon} style={{ position: 'relative', overflow: 'visible' }}>
        {jiggle && <div className={s.dockDeleteBadge} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }} />}
        <DockIcon item={item} />
      </div>
    </a>
  )
}
