export interface NavLink {
  name: string
  url: string
  icon?: string
  iconText?: string
  desc: string
  color?: [string, string]
  public?: boolean
}

export interface Category {
  title: string
  links: NavLink[]
  public?: boolean
}

export interface DockItem {
  name: string
  url?: string
  emoji: string
  icon?: string
  iconText?: string
  action?: 'settings'
  public?: boolean
}

export interface NavConfig {
  greeting: { name: string; subtitle: string }
  menuBar: { items: string[] }
  settings?: { linkTarget?: 'new' | 'self'; iconSize?: number; nameFontSize?: number; showSearch?: boolean; cardStyle?: string; iconStyle?: string; showGreeting?: boolean; showSubtitle?: boolean; categoryFontSize?: number; bgImage?: string; bgBlur?: number }
  favicon?: string
  avatar?: string
  categories: Category[]
  dock: { items: DockItem[]; utilities: DockItem[] }
}
