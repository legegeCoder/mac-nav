import { useState, useEffect } from 'react'

export type CardStyle = 'default' | 'minimal' | 'glass' | 'neumorphic' | 'launchpad'
export type IconStyle = 'emoji' | 'outlined' | 'filled'

export function useSettings() {
  const [cardStyle, setCardStyle] = useState<CardStyle>(
    () => (localStorage.getItem('cardStyle') as CardStyle) || 'default'
  )
  const [iconStyle, setIconStyle] = useState<IconStyle>(
    () => (localStorage.getItem('iconStyle') as IconStyle) || 'emoji'
  )

  useEffect(() => { localStorage.setItem('cardStyle', cardStyle) }, [cardStyle])
  useEffect(() => { localStorage.setItem('iconStyle', iconStyle) }, [iconStyle])

  return { cardStyle, setCardStyle, iconStyle, setIconStyle }
}
