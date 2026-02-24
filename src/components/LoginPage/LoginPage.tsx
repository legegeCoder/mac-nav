import {type KeyboardEvent, useState} from 'react'
import s from './LoginPage.module.css'

interface Props {
  onLogin: (password: string) => Promise<boolean>
  avatar?: string
  name?: string
}

export default function LoginPage({ onLogin, avatar, name }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = async () => {
    if (!password || loading) return
    setLoading(true)
    setError(false)
    const ok = await onLogin(password)
    if (!ok) {
      setError(true)
      setShake(true)
      setLoading(false)
      setTimeout(() => setShake(false), 600)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className={s.wrap}>
      <div className={s.content}>
        {/* macOS-style avatar circle */}
        <div className={s.avatar}>
          {avatar ? (
            <img className={s.avatarImg} src={avatar} alt="" />
          ) : (
            <svg className={s.avatarIcon} viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="18" r="9" fill="rgba(255,255,255,0.9)" />
              <ellipse cx="24" cy="40" rx="14" ry="10" fill="rgba(255,255,255,0.9)" />
            </svg>
          )}
        </div>

        <h1 className={s.name}>{name || 'Nav'}</h1>

        <div className={`${s.inputWrap} ${shake ? s.shake : ''}`}>
          <input
            className={`${s.input} ${error ? s.inputError : ''}`}
            type="password"
            placeholder="输入密码"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            onKeyDown={onKeyDown}
            autoFocus
          />
          <button
            className={s.arrowBtn}
            onClick={handleSubmit}
            disabled={loading || !password}
            aria-label="登录"
          >
            {loading ? (
              <div className={s.spinner} />
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {error && <p className={s.hint}>密码错误，请重试</p>}
      </div>
    </div>
  )
}
