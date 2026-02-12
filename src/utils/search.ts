export function handleSearch(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return
  if (trimmed.startsWith('http') || trimmed.includes('.')) {
    window.location.href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  } else {
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
  }
}
