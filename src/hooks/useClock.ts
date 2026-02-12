import { useState, useEffect } from 'react'

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return '早上好'
  if (hour >= 12 && hour < 14) return '中午好'
  if (hour >= 14 && hour < 18) return '下午好'
  if (hour >= 18 && hour < 22) return '晚上好'
  return '夜深了'
}

function formatDateTime(): string {
  return new Date().toLocaleDateString('zh-CN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
}

export function useClock() {
  const [dateTime, setDateTime] = useState(formatDateTime)
  const [greeting, setGreeting] = useState(() => getGreeting(new Date().getHours()))

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(formatDateTime())
      setGreeting(getGreeting(new Date().getHours()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return { dateTime, greeting }
}
