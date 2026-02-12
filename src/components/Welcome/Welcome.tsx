import s from './Welcome.module.css'

interface Props {
  greeting: string
  name: string
  subtitle: string
}

export default function Welcome({ greeting, name, subtitle }: Props) {
  return (
    <div className={s.wrap}>
      <h1 className={s.title}>{greeting}，{name}</h1>
      <p className={s.subtitle}>{subtitle}</p>
    </div>
  )
}
