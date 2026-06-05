import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import './index.css'

import LoginPage from './pages/LoginPage'
import PredictPage from './pages/PredictPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import StandingsPage from './pages/StandingsPage'

// ─── Context ──────────────────────────────────────────────────
export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

// ─── Toast ────────────────────────────────────────────────────
let _addToast = null
export function toast(msg, type = 'info') {
  if (_addToast) _addToast(msg, type)
}

function ToastContainer() {
  const [toasts, setToasts] = useState([])
  _addToast = useCallback((msg, type) => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────
function Header({ player, isAdmin, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <NavLink to="/" className="header-logo">
          <span className="header-logo-icon">🏆</span>
          <div>
            <div className="header-logo-text">WC2026 PREDICTOR</div>
            <div className="header-logo-sub">World Cup 2026</div>
          </div>
        </NavLink>

        <nav className="header-nav">
          <NavLink to="/" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            ⚽ Dự Đoán
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            🏅 Bảng Xếp Hạng
          </NavLink>
          <NavLink to="/standings" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
            📊 Bảng Đấu
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
              ⚙️ Admin
            </NavLink>
          )}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="header-user">
            <div className="user-avatar">{player?.name?.[0]?.toUpperCase()}</div>
            <span>{player?.name}</span>
            {isAdmin && <span style={{ fontSize: 10, background: 'rgba(255,165,0,0.3)', padding: '1px 5px', borderRadius: 6, color: '#ffc940' }}>ADMIN</span>}
          </div>
          <button className="nav-btn" onClick={onLogout} title="Đổi tên">
            ↩
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Mobile Bottom Nav ─────────────────────────────────────────
function BottomNav({ isAdmin }) {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span>⚽</span><span>Dự Đoán</span>
      </NavLink>
      <NavLink to="/leaderboard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span>🏅</span><span>Xếp Hạng</span>
      </NavLink>
      <NavLink to="/standings" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span>📊</span><span>Bảng Đấu</span>
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <span>⚙️</span><span>Admin</span>
        </NavLink>
      )}
    </nav>
  )
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [player, setPlayer] = useState(() => {
    const saved = localStorage.getItem('wc2026_player')
    return saved ? JSON.parse(saved) : null
  })
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('wc2026_admin') === 'true')

  function handleLogin(playerData, adminMode = false) {
    setPlayer(playerData)
    setIsAdmin(adminMode)
    localStorage.setItem('wc2026_player', JSON.stringify(playerData))
    if (adminMode) localStorage.setItem('wc2026_admin', 'true')
  }

  function handleLogout() {
    setPlayer(null)
    setIsAdmin(false)
    localStorage.removeItem('wc2026_player')
    localStorage.removeItem('wc2026_admin')
  }

  if (!player) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <ToastContainer />
      </>
    )
  }

  return (
    <AppContext.Provider value={{ player, isAdmin }}>
      <BrowserRouter>
        <div className="app-layout">
          <Header player={player} isAdmin={isAdmin} onLogout={handleLogout} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<PredictPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/admin" element={isAdmin ? <AdminPage /> : <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-title">Không có quyền truy cập</div></div>} />
            </Routes>
          </main>
          <BottomNav isAdmin={isAdmin} />
          <ToastContainer />
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  )
}
