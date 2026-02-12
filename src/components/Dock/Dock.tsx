import { useState } from 'react'
import type { DockItem, NavLink } from '../../types/nav'
import s from './Dock.module.css'

interface Props {
  items: DockItem[]
  utilities: DockItem[]
  linkTarget: 'new' | 'self'
  onSettingsClick: () => void
  onDropLink: (link: NavLink) => void
  onItemContextMenu?: (e: React.MouseEvent, item: DockItem, idx: number) => void
  onReorderDock?: (fromIdx: number, toIdx: number) => void
}

export default function Dock({ items, utilities, linkTarget, onSettingsClick, onDropLink, onItemContextMenu, onReorderDock }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const handleClick = (item: DockItem, e: React.MouseEvent) => {
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
          <a
            key={`${idx}-${item.name}`}
            href={item.url}
            target={linkTarget === 'new' ? '_blank' : '_self'}
            rel={linkTarget === 'new' ? 'noopener noreferrer' : undefined}
            className={`${s.item} ${dragOverIdx === idx ? s.itemDropTarget : ''}`}
            draggable
            onDragStart={(e) => onItemDragStart(e, idx)}
            onDragEnd={onItemDragEnd}
            onDragOver={(e) => onItemDragOver(e, idx)}
            onDragLeave={onItemDragLeave}
            onDrop={(e) => onItemDrop(e, idx)}
            onContextMenu={(e) => handleItemContext(e, item, idx)}
          >
            <span className={s.label}>{item.name}</span>
            <div className={s.icon}>{item.emoji}</div>
          </a>
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
            <div className={s.icon}>{item.emoji}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
