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
}

export default function Dock({ items, utilities, linkTarget, onSettingsClick, onDropLink, onItemContextMenu }: Props) {
  const [dragOver, setDragOver] = useState(false)

  const handleClick = (item: DockItem, e: React.MouseEvent) => {
    if (item.action === 'settings') {
      e.preventDefault()
      onSettingsClick()
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/nav-link')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    }
  }

  const onDragLeave = () => setDragOver(false)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const raw = e.dataTransfer.getData('application/nav-link')
    if (!raw) return
    try {
      const link = JSON.parse(raw) as NavLink
      onDropLink(link)
    } catch { /* ignore */ }
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
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {items.map((item, idx) => (
          <a
            key={item.name}
            href={item.url}
            target={linkTarget === 'new' ? '_blank' : '_self'}
            rel={linkTarget === 'new' ? 'noopener noreferrer' : undefined}
            className={s.item}
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
