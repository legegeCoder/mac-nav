import { useEffect, useRef } from 'react'
import s from './ContextMenu.module.css'

export interface MenuItem {
  label: string
  icon?: string
  danger?: boolean
  divider?: boolean
  onClick: () => void
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (x + rect.width > vw) el.style.left = `${vw - rect.width - 8}px`
    if (y + rect.height > vh) el.style.top = `${vh - rect.height - 8}px`
  }, [x, y])

  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('click', handler)
    document.addEventListener('contextmenu', handler)
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('contextmenu', handler)
    }
  }, [onClose])

  return (
    <div ref={ref} className={s.menu} style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      {items.map((item, i) => (
        item.divider ? (
          <div key={i} className={s.divider} />
        ) : (
          <button
            key={i}
            className={`${s.item} ${item.danger ? s.danger : ''}`}
            onClick={() => { item.onClick(); onClose() }}
          >
            {item.icon && <span className={s.itemIcon}>{item.icon}</span>}
            {item.label}
          </button>
        )
      ))}
    </div>
  )
}
