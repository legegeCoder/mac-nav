import {useCallback, useRef, useState} from 'react'
import type {Category, NavLink} from '../../types/nav'
import type {IconStyle} from '../../hooks/useSettings'
import WindowCard from '../WindowCard/WindowCard'
import s from './CategorySection.module.css'

interface Props {
  category: Category
  catIdx: number
  iconStyle: IconStyle
  linkTarget: 'new' | 'self'
  iconSize?: number
  nameFontSize?: number
  jiggle?: boolean
  onCardContextMenu?: (e: React.MouseEvent, link: NavLink) => void
  onReorderCard?: (fromCat: number, fromIdx: number, toCat: number, toIdx: number) => void
  onRenameCategory?: (catIdx: number, newTitle: string) => void
  onDeleteCard?: (catIdx: number, linkIdx: number) => void
}

export default function CategorySection({ category, catIdx, iconStyle, linkTarget, iconSize, nameFontSize, jiggle, onCardContextMenu, onReorderCard, onRenameCategory, onDeleteCard }: Props) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [gridDragOver, setGridDragOver] = useState(false)
  const dragCounter = useRef(0)

  const startEditing = useCallback(() => {
    if (!onRenameCategory || editing) return
    setEditTitle(category.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [category.title, onRenameCategory, editing])

  const commitEdit = useCallback(() => {
    setEditing(false)
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== category.title && onRenameCategory) {
      onRenameCategory(catIdx, trimmed)
    }
  }, [editTitle, category.title, catIdx, onRenameCategory])

  const gridCls = [
    s.grid,
    s.gridLaunchpad,
    gridDragOver ? s.gridDropTarget : '',
  ].filter(Boolean).join(' ')

  const onGridDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/card-reorder')) {
      e.preventDefault()
      dragCounter.current++
      setGridDragOver(true)
    }
  }

  const onGridDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/card-reorder')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const onGridDragLeave = () => {
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setGridDragOver(false)
    }
  }

  const onGridDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setGridDragOver(false)
    const raw = e.dataTransfer.getData('application/card-reorder')
    if (!raw || !onReorderCard) return
    try {
      const from = JSON.parse(raw) as { catIdx: number; linkIdx: number }
      onReorderCard(from.catIdx, from.linkIdx, catIdx, category.links.length)
    } catch { /* ignore */ }
  }

  return (
    <section>
      <h2 className={`${s.title} ${s.titleLaunchpad}`} onClick={startEditing} style={onRenameCategory ? { cursor: 'pointer' } : undefined}>
        {editing ? (
          <input
            ref={inputRef}
            className={s.titleInput}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          />
        ) : category.title}
      </h2>
      <div
        className={gridCls}
        onDragEnter={onGridDragEnter}
        onDragOver={onGridDragOver}
        onDragLeave={onGridDragLeave}
        onDrop={onGridDrop}
      >
        {category.links.length === 0 && (
          <div className={s.emptyHint}>拖拽链接到此分类</div>
        )}
        {category.links.map((link, i) => (
          <WindowCard
            key={`${catIdx}-${i}-${link.url}`}
            link={link}
            catIdx={catIdx}
            linkIdx={i}
            iconStyle={iconStyle}
            linkTarget={linkTarget}
            index={i}
            iconSize={iconSize}
            nameFontSize={nameFontSize}
            jiggle={jiggle}
            onContextMenu={onCardContextMenu}
            onReorder={onReorderCard}
            onDelete={() => onDeleteCard?.(catIdx, i)}
          />
        ))}
      </div>
    </section>
  )
}
