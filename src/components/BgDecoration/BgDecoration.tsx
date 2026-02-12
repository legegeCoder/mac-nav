import s from './BgDecoration.module.css'

export default function BgDecoration() {
  return (
    <div className={s.wrap}>
      <div className={`${s.orb} ${s.orb1}`} />
      <div className={`${s.orb} ${s.orb2}`} />
      <div className={`${s.orb} ${s.orb3}`} />
    </div>
  )
}
