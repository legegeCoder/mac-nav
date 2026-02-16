import {useMemo, useState} from 'react'
import type {NavLink} from '../../types/nav'
import type {CardStyle, IconStyle} from '../../hooks/useSettings'
import s from './WindowCard.module.css'

interface Props {
  link: NavLink
  catIdx: number
  linkIdx: number
  cardStyle: CardStyle
  iconStyle: IconStyle
  linkTarget: 'new' | 'self'
  index: number
  iconSize?: number
  nameFontSize?: number
  jiggle?: boolean
  onContextMenu?: (e: React.MouseEvent, link: NavLink) => void
  onReorder?: (fromCat: number, fromIdx: number, toCat: number, toIdx: number) => void
  onDelete?: () => void
}

export default function WindowCard({ link, catIdx, linkIdx, cardStyle, iconStyle, linkTarget, index, iconSize, nameFontSize, jiggle, onContextMenu, onReorder, onDelete }: Props) {
  const [imgErr, setImgErr] = useState(false)

  const cls = [
    s.card,
    cardStyle !== 'classic' ? s[`style_${cardStyle}`] : '',
    jiggle ? s.jiggle : '',
  ].filter(Boolean).join(' ')

  const hasIcon = !!link.icon && !imgErr

  const iconCls = [
    s.icon,
    iconStyle === 'outlined' ? s.iconOutlined : '',
    iconStyle === 'filled' ? s.iconFilled : '',
    hasIcon ? s.iconHasImg : '',
    cardStyle === 'launchpad' && hasIcon ? s.iconLpClean : '',
  ].filter(Boolean).join(' ')

  const launchpadVars = cardStyle === 'launchpad' && link.color && !hasIcon
    ? { '--lp-a': link.color[0], '--lp-b': link.color[1] } as React.CSSProperties
    : undefined

  // Randomize jiggle angle per card so they don't all move in sync
  const jiggleVars = useMemo(() => {
    const a = -(1 + Math.random() * 1.5)
    const b = 1 + Math.random() * 1.5
    const delay = Math.random() * 0.2
    return { '--jiggle-a': `${a}deg`, '--jiggle-b': `${b}deg`, animationDelay: `${delay}s` } as React.CSSProperties
  }, [])

  const renderIcon = () => {
    if (link.icon && !imgErr) {
      return <img src={link.icon} alt="" className={s.faviconImg} onError={() => setImgErr(true)} />
    }
    return <span className={s.iconText} data-len={Math.min((link.iconText || link.name.slice(0, 2)).length, 8)}>{link.iconText || link.name.slice(0, 2)}</span>
  }

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/nav-link', JSON.stringify(link))
    e.dataTransfer.setData('application/card-reorder', JSON.stringify({ catIdx, linkIdx }))
    e.dataTransfer.effectAllowed = 'copyMove'
    ;(e.target as HTMLElement).style.opacity = '0.4'
  }

  const onDragEnd = (e: React.DragEvent) => {
    ;(e.target as HTMLElement).style.opacity = ''
  }

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/card-reorder')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      ;(e.currentTarget as HTMLElement).classList.add(s.dropTarget)
    }
  }

  const onDragLeave = (e: React.DragEvent) => {
    ;(e.currentTarget as HTMLElement).classList.remove(s.dropTarget)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).classList.remove(s.dropTarget)
    const raw = e.dataTransfer.getData('application/card-reorder')
    if (!raw || !onReorder) return
    try {
      const from = JSON.parse(raw) as { catIdx: number; linkIdx: number }
      if (from.catIdx === catIdx && from.linkIdx === linkIdx) return
      onReorder(from.catIdx, from.linkIdx, catIdx, linkIdx)
    } catch { /* ignore */ }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, link)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    if (jiggle) { e.preventDefault() }
  }

  const card = (
    <a
      href={link.url}
      target={linkTarget === 'new' ? '_blank' : '_self'}
      rel={linkTarget === 'new' ? 'noopener noreferrer' : undefined}
      className={cls}
      style={{ ...launchpadVars, ...(jiggle ? jiggleVars : {}), animationDelay: jiggle ? jiggleVars.animationDelay : `${0.1 + index * 0.1}s`, '--icon-size': iconSize ? `${iconSize}px` : undefined, '--name-fs': nameFontSize ? `${nameFontSize}px` : undefined } as React.CSSProperties}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
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
        <div className={iconCls} style={{ position: 'relative' }}>
          {jiggle && <div className={s.deleteBadge} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.() }} />}
          {renderIcon()}
        </div>
        <h3 className={s.name}>{link.name}</h3>
        <p className={s.desc}>{link.desc}</p>
      </div>
    </a>
  )

  return card
}
