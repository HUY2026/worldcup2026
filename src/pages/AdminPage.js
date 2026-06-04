import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../App'
import { toVNTime, isMatchLocked, ROUND_LABELS, calculatePoints, getWinner } from '../lib/utils'

export default function AdminPage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('group')
  const [scoring, setScoring] = useState({}) // matchId -> loading
  const [inputs, setInputs] = useState({}) // matchId -> {home, away}
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ home: '', away: '', round: 'r32', date: '' })
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => { loadMatches() }, [])

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').order('match_time')
    setMatches(data || [])
    // Init inputs from existing scores
    const init = {}
    ;(data || []).forEach(m => {
      if (m.home_score !== null) {
        init[m.id] = { home: m.home_score, away: m.away_score }
      } else {
        init[m.id] = { home: '', away: '' }
      }
    })
    setInputs(init)
    setLoading(false)
  }

  function getResult(home, away) {
    if (home > away) return 'home'
    if (home < away) return 'away'
    return 'draw'
  }

  async function handleSaveResult(match) {
    const inp = inputs[match.id]
    if (inp.home === '' || inp.away === '') return toast('Nhập tỷ số trước!', 'error')
    const home = parseInt(inp.home)
    const away = parseInt(inp.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return toast('Tỷ số không hợp lệ', 'error')

    const result = getResult(home, away)
    setScoring(s => ({ ...s, [match.id]: true }))

    try {
      // 1. Cập nhật kết quả trận đấu
      const { error: matchErr } = await supabase.from('matches')
        .update({ home_score: home, away_score: away, result })
        .eq('id', match.id)
      if (matchErr) throw matchErr

      // 2. Lấy tất cả dự đoán cho trận này
      const { data: preds, error: predErr } = await supabase
        .from('predictions').select('*').eq('match_id', match.id)
      if (predErr) throw predErr

      // 3. Tính điểm và update từng dự đoán
      const updatedMatch = { ...match, home_score: home, away_score: away, result }
      const updates = (preds || []).map(pred => ({
        id: pred.id,
        points: calculatePoints(pred, updatedMatch),
        is_scored: true
      }))

      if (updates.length > 0) {
        for (const upd of updates) {
          await supabase.from('predictions').update({ points: upd.points, is_scored: true }).eq('id', upd.id)
        }
      }

      // 4. Tính lại tổng điểm cho tất cả players
      const affectedPlayerIds = [...new Set((preds || []).map(p => p.player_id))]
      for (const pid of affectedPlayerIds) {
        const { data: allPreds } = await supabase
          .from('predictions').select('points').eq('player_id', pid).eq('is_scored', true)
        const total = (allPreds || []).reduce((s, p) => s + (p.points || 0), 0)
        await supabase.from('players').update({ total_points: total }).eq('id', pid)
      }

      // 5. Update local state
      setMatches(ms => ms.map(m => m.id === match.id ? updatedMatch : m))
      toast(`✅ Đã lưu kết quả và tính điểm cho ${updates.length} dự đoán!`, 'success')
    } catch (err) {
      console.error(err)
      toast('Lỗi khi lưu kết quả!', 'error')
    } finally {
      setScoring(s => ({ ...s, [match.id]: false }))
    }
  }

  async function handleAddKnockoutMatch() {
    const { home, away, round, date } = addForm
    if (!home.trim() || !away.trim()) return toast('Nhập tên 2 đội!', 'error')
    if (!date) return toast('Nhập ngày giờ thi đấu!', 'error')

    setAddLoading(true)
    try {
      const vnDate = new Date(date + ':00+07:00')
      if (isNaN(vnDate.getTime())) throw new Error('Ngày không hợp lệ')
      const { error } = await supabase.from('matches').insert({
        round, home_team: home.trim(), away_team: away.trim(),
        match_time: vnDate.toISOString(),
        match_number: Math.floor(Date.now() / 1000)
      })
      if (error) throw error
      toast('✅ Đã thêm trận đấu!', 'success')
      setShowAddModal(false)
      setAddForm({ home: '', away: '', round: 'r32', date: '' })
      loadMatches()
    } catch (err) {
      console.error(err)
      toast('Lỗi khi thêm trận: ' + (err.message || ''), 'error')
    } finally {
      setAddLoading(false)
    }
  }

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  )

  const groupMatches = matches.filter(m => m.round === 'group')
  const knockoutMatches = matches.filter(m => m.round !== 'group')
  const rounds = [...new Set(matches.map(m => m.round))]

  const tabMatches = activeTab === 'group' ? groupMatches : matches.filter(m => m.round === activeTab)

  const doneCnt = tabMatches.filter(m => m.result !== null).length

  return (
    <div>
      {/* Admin header */}
      <div style={{
        background: 'linear-gradient(135deg, #7a3a00, var(--accent))',
        borderRadius: 'var(--radius)', padding: '16px 20px',
        color: 'white', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontFamily: 'Oswald', fontSize: 20, fontWeight: 700 }}>⚙️ Bảng Quản Trị</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Nhập kết quả trận đấu và hệ thống tự động tính điểm</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Oswald', fontSize: 24, fontWeight: 700 }}>{doneCnt}/{tabMatches.length}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Đã có kết quả</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`} onClick={() => setActiveTab('group')}>
          Vòng Bảng ({groupMatches.filter(m => m.result).length}/{groupMatches.length})
        </button>
        {[...new Set(knockoutMatches.map(m => m.round))].map(r => (
          <button key={r} className={`tab-btn ${activeTab === r ? 'active' : ''}`} onClick={() => setActiveTab(r)}>
            {ROUND_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Add knockout match button */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button className="btn btn-accent btn-sm" onClick={() => setShowAddModal(true)}>
          ➕ Thêm trận vòng loại trực tiếp
        </button>
      </div>

      {/* Add Match Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div style={{
            background: 'white', borderRadius: 'var(--radius)', padding: 24,
            width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          }}>
            <div style={{ fontFamily: 'Oswald', fontSize: 18, fontWeight: 700, marginBottom: 18, color: 'var(--primary)' }}>
              ➕ Thêm trận vòng loại trực tiếp
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Đội 1 (Chủ nhà)</label>
                <input
                  className="score-input"
                  style={{ width: '100%', maxWidth: '100%', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="Ví dụ: Pháp"
                  value={addForm.home}
                  onChange={e => setAddForm(f => ({ ...f, home: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Đội 2 (Khách)</label>
                <input
                  className="score-input"
                  style={{ width: '100%', maxWidth: '100%', padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }}
                  placeholder="Ví dụ: Đức"
                  value={addForm.away}
                  onChange={e => setAddForm(f => ({ ...f, away: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Vòng đấu</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', fontSize: 14, borderRadius: 8, border: '1.5px solid var(--border)', outline: 'none', background: 'white' }}
                  value={addForm.round}
                  onChange={e => setAddForm(f => ({ ...f, round: e.target.value }))}
                >
                  <option value="r32">Vòng 1/32</option>
                  <option value="r16">Vòng 1/16</option>
                  <option value="qf">Tứ Kết</option>
                  <option value="sf">Bán Kết</option>
                  <option value="final">Chung Kết</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ngày & Giờ (theo giờ VN)</label>
                <input
                  type="datetime-local"
                  style={{ width: '100%', padding: '8px 12px', fontSize: 14, borderRadius: 8, border: '1.5px solid var(--border)', outline: 'none', boxSizing: 'border-box' }}
                  value={addForm.date}
                  onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ flex: 1 }}
                onClick={() => setShowAddModal(false)}
                disabled={addLoading}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={handleAddKnockoutMatch}
                disabled={addLoading}
              >
                {addLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Đang thêm...</> : '✅ Thêm trận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match list */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {tabMatches.length === 0 && (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">Chưa có trận đấu nào</div>
            </div>
          )}
          {tabMatches.map((match, idx) => {
            const inp = inputs[match.id] || { home: '', away: '' }
            const hasResult = match.result !== null
            const locked = isMatchLocked(match.match_time)

            return (
              <div key={match.id} style={{
                padding: '14px 16px',
                borderBottom: idx < tabMatches.length - 1 ? '1px solid var(--border)' : 'none',
                background: hasResult ? '#f5fff8' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Match info */}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontFamily: 'Oswald', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      {match.home_team} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>vs</span> {match.away_team}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      🕐 {toVNTime(match.match_time)}
                      {match.group_name && <span style={{ marginLeft: 8 }}>• Bảng {match.group_name}</span>}
                    </div>
                  </div>

                  {/* Score inputs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number" min="0" max="20"
                      className="score-input"
                      value={inp.home}
                      onChange={e => setInputs(s => ({ ...s, [match.id]: { ...inp, home: e.target.value } }))}
                      placeholder="0"
                    />
                    <span style={{ fontFamily: 'Oswald', fontWeight: 700, color: 'var(--text-muted)', fontSize: 18 }}>-</span>
                    <input
                      type="number" min="0" max="20"
                      className="score-input"
                      value={inp.away}
                      onChange={e => setInputs(s => ({ ...s, [match.id]: { ...inp, away: e.target.value } }))}
                      placeholder="0"
                    />
                  </div>

                  {/* Current result */}
                  {hasResult && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 8,
                      background: '#e8f7ee', color: 'var(--success)',
                      fontSize: 13, fontWeight: 700
                    }}>
                      ✅ {match.home_score}-{match.away_score}
                    </span>
                  )}

                  {/* Save button */}
                  <button
                    className={`btn btn-sm ${hasResult ? 'btn-outline' : 'btn-primary'}`}
                    onClick={() => handleSaveResult(match)}
                    disabled={scoring[match.id]}
                    style={{ minWidth: 80 }}
                  >
                    {scoring[match.id]
                      ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Đang xử lý...</>
                      : hasResult ? '🔄 Cập nhật' : '💾 Lưu kết quả'
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scoring rules reminder */}
      <div style={{
        marginTop: 20,
        background: 'var(--primary-bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        fontSize: 13,
        color: 'var(--text-muted)'
      }}>
        <strong style={{ color: 'var(--primary)' }}>📊 Quy tắc tính điểm:</strong>
        <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>• Vòng bảng (T/H/B đúng): <strong style={{ color: 'var(--primary)' }}>+2đ</strong></span>
          <span>• Loại trực tiếp (đúng đội thắng): <strong style={{ color: 'var(--success)' }}>+3đ</strong></span>
          <span>• Loại trực tiếp (đúng tỷ số): <strong style={{ color: '#b07800' }}>+7đ</strong></span>
        </div>
      </div>
    </div>
  )
}
