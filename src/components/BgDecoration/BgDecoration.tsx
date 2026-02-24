import s from './BgDecoration.module.css'

interface Props {
  bgImage?: string
  bgBlur?: number
  bgOverlay?: number
}

export default function BgDecoration({ bgImage, bgBlur = 0, bgOverlay = 0 }: Props) {
  if (bgImage) {
    return (
      <div className={s.wrap}>
        <div
          className={s.bgImage}
          style={{
            backgroundImage: `url(${bgImage})`,
            filter: bgBlur ? `blur(${bgBlur}px)` : undefined,
          }}
        />
        {bgOverlay > 0 && (
          <div
            className={s.overlay}
            style={{ background: `rgba(0, 0, 0, ${bgOverlay / 100})` }}
          />
        )}
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={`${s.orb} ${s.orb1}`} />
      <div className={`${s.orb} ${s.orb2}`} />
      <div className={`${s.orb} ${s.orb3}`} />
    </div>
  )
}
