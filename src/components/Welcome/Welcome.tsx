import s from './Welcome.module.css'

interface Props {
  greeting: string
  name: string
  subtitle: string
  showGreeting?: boolean
  showSubtitle?: boolean
}

export default function Welcome({ greeting, name, subtitle, showGreeting = true, showSubtitle = true }: Props) {
  if (!showGreeting && !showSubtitle) return null
  return (
    <div className={s.wrap}>
      {showGreeting && <h1 className={s.title}>{greeting}，{name}</h1>}
      {showSubtitle && <p className={s.subtitle}>{subtitle}</p>}
    </div>
  )
}
