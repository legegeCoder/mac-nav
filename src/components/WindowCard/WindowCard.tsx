import type { NavLink } from '../../types/nav'
import type { CardStyle, IconStyle } from '../../hooks/useSettings'
import s from './WindowCard.module.css'

interface Props {
  link: NavLink
  cardStyle: CardStyle
  iconStyle: IconStyle
  linkTarget: 'new' | 'self'
  index: number
  onContextMenu?: (e: React.MouseEvent, link: NavLink) => void
}

export default function WindowCard({ link, cardStyle, iconStyle, linkTarget, index, onContextMenu }: Props) {
  const cls = [
    s.card,
    cardStyle !== 'default' ? s[`style_${cardStyle}`] : '',
  ].filter(Boolean).join(' ')

  const iconCls = [
    s.icon,
    iconStyle === 'outlined' ? s.iconOutlined : '',
    iconStyle === 'filled' ? s.iconFilled : '',
  ].filter(Boolean).join(' ')

  const launchpadVars = cardStyle === 'launchpad' && link.color
    ? { '--lp-a': link.color[0], '--lp-b': link.color[1] } as React.CSSProperties
    : undefined

  const renderIcon = () => {
    if (iconStyle !== 'emoji' && link.faIcon) {
      return <i className={link.faIcon} />
    }
    return <>{link.emoji}</>
  }

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/nav-link', JSON.stringify(link))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, link)
    }
  }

  return (
    <a
      href={link.url}
      target={linkTarget === 'new' ? '_blank' : '_self'}
      rel={linkTarget === 'new' ? 'noopener noreferrer' : undefined}
      className={cls}
      style={{ ...launchpadVars, animationDelay: `${0.1 + index * 0.1}s` }}
      draggable
      onDragStart={onDragStart}
      onContextMenu={handleContextMenu}
    >
      <div className={s.header}>
        <div className={s.controls}>
          <span className={`${s.btn} ${s.close}`} />
          <span className={`${s.btn} ${s.minimize}`} />
          <span className={`${s.btn} ${s.maximize}`} />
        </div>
        <span className={s.title}>{link.name}</span>
      </div>
      <div className={s.content}>
        <div className={iconCls}>{renderIcon()}</div>
        <h3 className={s.name}>{link.name}</h3>
        <p className={s.desc}>{link.desc}</p>
      </div>
    </a>
  )
}
