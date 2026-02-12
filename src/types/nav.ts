export interface NavLink {
  name: string
  url: string
  emoji: string
  faIcon?: string
  desc: string
  color?: [string, string]
}

export interface Category {
  title: string
  links: NavLink[]
}

export interface DockItem {
  name: string
  url?: string
  emoji: string
  action?: 'settings'
}

export interface NavConfig {
  greeting: { name: string; subtitle: string }
  menuBar: { items: string[] }
  settings?: { linkTarget?: 'new' | 'self' }
  favicon?: string
  avatar?: string
  categories: Category[]
  dock: { items: DockItem[]; utilities: DockItem[] }
}
