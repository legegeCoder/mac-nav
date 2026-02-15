export interface NavLink {
  name: string
  url: string
  icon?: string
  iconText?: string
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
  icon?: string
  iconText?: string
  action?: 'settings'
}

export interface NavConfig {
  greeting: { name: string; subtitle: string }
  menuBar: { items: string[] }
  settings?: { linkTarget?: 'new' | 'self'; iconSize?: number; nameFontSize?: number; showSearch?: boolean }
  favicon?: string
  avatar?: string
  categories: Category[]
  dock: { items: DockItem[]; utilities: DockItem[] }
}
