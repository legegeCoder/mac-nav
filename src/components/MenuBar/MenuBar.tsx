import { useState, useRef, useEffect, useCallback } from 'react'
import { useClock } from '../../hooks/useClock'
import s from './MenuBar.module.css'

interface Props {
  items: string[]
  icon?: string
  onLogout: () => void
}

export default function MenuBar({ items, icon, onLogout }: Props) {
  const { dateTime } = useClock()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback(() => setMenuOpen((v) => !v), [])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className={s.bar}>
      <div className={s.left}>
        <div className={s.logoWrap} ref={menuRef}>
          <span className={`${s.logo} ${menuOpen ? s.logoActive : ''}`} onClick={toggle}>
            {icon ? <img className={s.logoImg} src={icon} alt="" /> : <>&#xF8FF;</>}
          </span>
          {menuOpen && (
            <div className={s.dropdown}>
              <button className={s.dropItem} onClick={() => { setMenuOpen(false); onLogout() }}>
                <span className={s.dropIcon}>🚪</span>
                退出登录
              </button>
            </div>
          )}
        </div>
        {items.map((item) => (
          <span key={item} className={s.item}>{item}</span>
        ))}
      </div>
      <div className={s.right}>
        <span>100%</span>
        <span>Wi-Fi</span>
        <span>{dateTime}</span>
      </div>
    </div>
  )
}
