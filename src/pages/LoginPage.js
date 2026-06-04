import React, { useState } from 'react'
import { supabase, ADMIN_PASSWORD } from '../lib/supabase'
import { toast } from '../App'

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return toast('Hãy nhập tên của bạn!', 'error')
    if (trimmed.length < 2) return toast('Tên phải có ít nhất 2 ký tự', 'error')
    if (adminMode && adminPass !== ADMIN_PASSWORD) {
      return toast('Mật khẩu admin không đúng!', 'error')
    }

    setLoading(true)
    try {
      // Tìm hoặc tạo player
      let { data: existing } = await supabase
        .from('players')
        .select('*')
        .eq('name', trimmed)
        .single()

      if (!existing) {
        const { data: newPlayer, error } = await supabase
          .from('players')
          .insert({ name: trimmed })
          .select()
          .single()
        if (error) throw error
        existing = newPlayer
      }

      onLogin(existing, adminMode && adminPass === ADMIN_PASSWORD)
      toast(`Chào mừng ${trimmed}! 🎉`, 'success')
    } catch (err) {
      console.error(err)
      toast('Có lỗi xảy ra, thử lại nhé!', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-trophy">🏆</div>
        <h1 className="login-title">WC2026 PREDICTOR</h1>
        <p className="login-sub">Dự đoán kết quả World Cup 2026 cùng bạn bè!</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <input
              className="input"
              type="text"
              placeholder="Nhập tên của bạn..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              autoFocus
            />
          </div>

          {adminMode && (
            <div>
              <input
                className="input"
                type="password"
                placeholder="Mật khẩu admin..."
                value={adminPass}
                onChange={e => setAdminPass(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? <><span className="spinner" /> Đang vào...</> : '⚽ Bắt đầu dự đoán'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => { setAdminMode(v => !v); setAdminPass('') }}
            style={{ width: '100%', color: 'var(--text-muted)', fontSize: 12 }}
          >
            {adminMode ? '← Quay lại đăng nhập thường' : '⚙️ Đăng nhập với quyền Admin'}
          </button>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-light)' }}>
          Không cần đăng ký • Chỉ cần nhập tên là chơi được
        </div>
      </div>
    </div>
  )
}
