import { useState, type KeyboardEvent } from 'react'
import { handleSearch } from '../../utils/search'
import s from './SearchBar.module.css'

interface Props {
  isLaunchpad?: boolean
}

export default function SearchBar({ isLaunchpad }: Props) {
  const [query, setQuery] = useState('')

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch(query)
  }

  return (
    <div className={`${s.wrap} ${isLaunchpad ? s.launchpad : ''}`}>
      <div className={s.box}>
        <span className={s.icon}>🔍</span>
        <input
          className={s.input}
          placeholder="搜索网站、应用或输入网址..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  )
}
