import { useClock } from '../../hooks/useClock'
import s from './MenuBar.module.css'

interface Props {
  items: string[]
}

export default function MenuBar({ items }: Props) {
  const { dateTime } = useClock()

  return (
    <div className={s.bar}>
      <div className={s.left}>
        <span className={s.logo}></span>
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
