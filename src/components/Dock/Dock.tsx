import type { DockItem } from '../../types/nav'
import s from './Dock.module.css'

interface Props {
  items: DockItem[]
  utilities: DockItem[]
  onSettingsClick: () => void
}

export default function Dock({ items, utilities, onSettingsClick }: Props) {
  const handleClick = (item: DockItem, e: React.MouseEvent) => {
    if (item.action === 'settings') {
      e.preventDefault()
      onSettingsClick()
    }
  }

  return (
    <div className={s.container}>
      <div className={s.dock}>
        {items.map((item) => (
          <a key={item.name} href={item.url} className={s.item}>
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
