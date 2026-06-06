import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../App'
import { toast } from '../App'
import { toVNTime, toVNTimeOnly, toVNDate, isMatchLocked, ROUND_LABELS, ROUND_ORDER } from '../lib/utils'

// ─── Group Match Card ─────────────────────────────────────────
function GroupMatchCard({ match, prediction, onPredict }) {
  const locked = isMatchLocked(match.match_time) || (match.result !== null && match.result !== undefined)
  const hasResult = match.result !== null && match.result !== undefined

  function getResultLabel(result) {
    if (result === 'home') return `${match.home_team} thắng`
    if (result === 'draw') return 'Hòa'
    if (result === 'away') return `${match.away_team} thắng`
    return ''
  }

  function getBtnClass(type) {
    let base = `predict-btn ${type}-btn`
    if (prediction?.predicted_result === type) base += ' selected'
    if (hasResult) {
      if (match.result === type) base += ' correct'
      else if (prediction?.predicted_result === type) base += ' wrong'
    }
    return base
  }

  return (
    <div className={`match-card ${locked ? 'locked' : ''} ${hasResult ? 'has-result' : ''}`}>
      <div className="match-meta">
        <span className="match-time-badge">🕐 {toVNTime(match.match_time)}</span>
        <span className={`match-status-badge ${hasResult ? 'done' : locked ? 'locked' : 'upcoming'}`}>
          {hasResult ? '✅ Có kết quả' : locked ? '🔒 Đã khóa' : '⏰ Sắp diễn ra'}
        </span>
      </div>

      <div className="match-teams">
        <div className="team-name home">{match.home_team}</div>
        {hasResult ? (
          <div className="match-score">
            <span className="score-num">{match.home_score}</span>
            <span className="score-sep">-</span>
            <span className="score-num">{match.away_score}</span>
          </div>
        ) : (
          <div className="match-vs">VS</div>
        )}
        <div className="team-name away">{match.away_team}</div>
      </div>

      <div className="predict-group">
        {['home', 'draw', 'away'].map(type => (
          <button
            key={type}
            className={getBtnClass(type)}
            onClick={() => !locked && onPredict(match.id, type)}
            disabled={locked}
          >
            {type === 'home' ? `🔵 ${match.home_team}` : type === 'draw' ? '🤝 Hòa' : `🟠 ${match.away_team}`}
          </button>
        ))}
      </div>

      {prediction && (
        <div className="prediction-summary">
          <span>Dự đoán của bạn: <strong>{getResultLabel(prediction.predicted_result)}</strong></span>
          {prediction.is_scored && (
            <span className={`points-badge ${prediction.points === 2 ? 'p2' : 'p0'}`}>
              {prediction.points}đ
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Knockout Match Card ──────────────────────────────────────
function KnockoutMatchCard({ match, prediction, onPredictKnockout }) {
  const locked = isMatchLocked(match.match_time) || (match.result !== null && match.result !== undefined)
  const hasResult = match.result !== null && match.result !== undefined
  const [winner, setWinner] = useState(prediction?.predicted_winner || '')
  const [homeScore, setHomeScore] = useState(prediction?.predicted_home_score ?? '')
  const [awayScore, setAwayScore] = useState(prediction?.predicted_away_score ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (prediction) {
      setWinner(prediction.predicted_winner || '')
      setHomeScore(prediction.predicted_home_score ?? '')
      setAwayScore(prediction.predicted_away_score ?? '')
    }
  }, [prediction])

  async function handleSave() {
    if (!winner) return toast('Chọn đội đi tiếp trước!', 'error')
    if (homeScore === '' || awayScore === '') return toast('Nhập tỷ số dự đoán!', 'error')
    const h = parseInt(homeScore), a = parseInt(awayScore)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return toast('Tỷ số không hợp lệ!', 'error')
    // Cho phép hòa (đá penalty) — chỉ cần tỷ số không mâu thuẫn với đội thắng
    // Tức là nếu tỷ số không hòa thì đội thắng phải khớp
    if (h !== a) {
      if (winner === match.home_team && h < a) return toast(`Tỷ số mâu thuẫn: ${match.home_team} thua nhưng được chọn đi tiếp`, 'error')
      if (winner === match.away_team && a < h) return toast(`Tỷ số mâu thuẫn: ${match.away_team} thua nhưng được chọn đi tiếp`, 'error')
    }
    // Nếu hòa thì OK — winner là đội thắng penalty
    setSaving(true)
    await onPredictKnockout(match.id, { winner, homeScore: h, awayScore: a })
    setSaving(false)
  }

  const pointsInfo = prediction?.is_scored ? (
    <span className={`points-badge ${prediction.points === 7 ? 'p7' : prediction.points === 3 ? 'p3' : 'p0'}`}>
      {prediction.points === 7 ? '🌟 7đ' : prediction.points === 3 ? '✅ 3đ' : '❌ 0đ'}
    </span>
  ) : null

  return (
    <div className={`match-card ${locked ? 'locked' : ''} ${hasResult ? 'has-result' : ''}`}>
      <div className="match-meta">
        <span className="match-time-badge">🕐 {toVNTime(match.match_time)}</span>
        <span className={`match-status-badge ${hasResult ? 'done' : locked ? 'locked' : 'upcoming'}`}>
          {hasResult ? '✅ Có kết quả' : locked ? '🔒 Đã khóa' : '⏰ Sắp diễn ra'}
        </span>
      </div>

      <div className="match-teams">
        <div className="team-name home">{match.home_team}</div>
        {hasResult ? (
          <div className="match-score">
            <span className="score-num">{match.home_score}</span>
            <span className="score-sep">-</span>
            <span className="score-num">{match.away_score}</span>
          </div>
        ) : (
          <div className="match-vs">VS</div>
        )}
        <div className="team-name away">{match.away_team}</div>
      </div>

      {!locked ? (
        <div className="knockout-predict">
          <div className="winner-btns">
            {[match.home_team, match.away_team].map(team => (
              <button
                key={team}
                className={`winner-btn ${winner === team ? 'selected' : ''}`}
                onClick={() => setWinner(team)}
              >
                {winner === team ? '✓ ' : ''}{team} đi tiếp
              </button>
            ))}
          </div>
          <div className="score-input-row">
            <span className="score-input-label">Tỷ số dự đoán:</span>
            <div className="score-inputs">
              <input
                type="number" min="0" max="20"
                className="score-input"
                value={homeScore}
                onChange={e => setHomeScore(e.target.value)}
                placeholder="0"
              />
              <span style={{ fontFamily: 'Oswald', fontWeight: 700, color: 'var(--text-muted)' }}>-</span>
              <input
                type="number" min="0" max="20"
                className="score-input"
                value={awayScore}
                onChange={e => setAwayScore(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-end' }}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '💾 Lưu dự đoán'}
          </button>
        </div>
      ) : (
        <div className="knockout-predict">
          {prediction ? (
            <div className="prediction-summary">
              <span>Đội đi tiếp: <strong>{prediction.predicted_winner}</strong></span>
              <span>Tỷ số: <strong>{prediction.predicted_home_score} - {prediction.predicted_away_score}</strong></span>
              {pointsInfo}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0' }}>
              🔒 Trận đã bắt đầu, chưa có dự đoán
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Predict Page ────────────────────────────────────────
export default function PredictPage() {
  const { player } = useApp()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({}) // matchId -> prediction
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('group')
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: matchData }, { data: predData }] = await Promise.all([
      supabase.from('matches').select('*').order('match_time'),
      supabase.from('predictions').select('*').eq('player_id', player.id)
    ])
    setMatches(matchData || [])
    const predMap = {}
    ;(predData || []).forEach(p => { predMap[p.match_id] = p })
    setPredictions(predMap)
    setLoading(false)
  }

  async function handleGroupPredict(matchId, result) {
    const existing = predictions[matchId]
    try {
      if (existing) {
        const { error } = await supabase.from('predictions')
          .update({ predicted_result: result })
          .eq('id', existing.id)
        if (error) throw error
        setPredictions(p => ({ ...p, [matchId]: { ...existing, predicted_result: result } }))
      } else {
        const { data, error } = await supabase.from('predictions')
          .insert({ player_id: player.id, match_id: matchId, predicted_result: result })
          .select().single()
        if (error) throw error
        setPredictions(p => ({ ...p, [matchId]: data }))
      }
      toast('Đã lưu dự đoán! ⚽', 'success')
    } catch (err) {
      toast('Lỗi khi lưu, thử lại!', 'error')
    }
  }

  async function handleKnockoutPredict(matchId, { winner, homeScore, awayScore }) {
    const existing = predictions[matchId]
    const payload = {
      player_id: player.id,
      match_id: matchId,
      predicted_winner: winner,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
    }
    try {
      if (existing) {
        const { error } = await supabase.from('predictions').update(payload).eq('id', existing.id)
        if (error) throw error
        setPredictions(p => ({ ...p, [matchId]: { ...existing, ...payload } }))
      } else {
        const { data, error } = await supabase.from('predictions').insert(payload).select().single()
        if (error) throw error
        setPredictions(p => ({ ...p, [matchId]: data }))
      }
      toast('Đã lưu dự đoán! 🎯', 'success')
    } catch (err) {
      toast('Lỗi khi lưu, thử lại!', 'error')
    }
  }

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Đang tải lịch thi đấu...</span>
    </div>
  )

  const groupMatches = matches.filter(m => m.round === 'group')
  const knockoutMatches = matches.filter(m => m.round !== 'group')
  const availableRounds = ROUND_ORDER.filter(r => knockoutMatches.some(m => m.round === r))

  // Groups for tabs
  const groups = [...new Set(groupMatches.map(m => m.group_name).filter(Boolean))].sort()

  // Stats
  const totalGroupPredictions = groupMatches.filter(m => predictions[m.id]).length
  const totalKnockoutPredictions = knockoutMatches.filter(m => predictions[m.id]).length
  const totalPoints = Object.values(predictions).reduce((sum, p) => sum + (p.points || 0), 0)

  return (
    <div>
      {/* Scoring rules info */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f7ff, #e8f4ff)',
        border: '1px solid #b3d4f5', borderRadius: 'var(--radius)',
        padding: '14px 18px', marginBottom: 16, fontSize: 13,
      }}>
        <div style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 15, color: 'var(--primary)', marginBottom: 10 }}>
          📊 Cách tính điểm
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 6, padding: '2px 9px', fontFamily: 'Oswald', fontWeight: 700, fontSize: 14 }}>+2đ</span>
            <span>Đoán đúng kết quả vòng bảng (T/H/B)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#2ecc71', color: 'white', borderRadius: 6, padding: '2px 9px', fontFamily: 'Oswald', fontWeight: 700, fontSize: 14 }}>+3đ</span>
            <span>Đoán đúng đội thắng vòng loại trực tiếp</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#f39c12', color: 'white', borderRadius: 6, padding: '2px 9px', fontFamily: 'Oswald', fontWeight: 700, fontSize: 14 }}>+7đ</span>
            <span>Đoán đúng cả đội thắng <strong>lẫn tỷ số chính xác</strong></span>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid #c8e0f7', paddingTop: 8 }}>
          💡 Trận bắt đầu hoặc đã có kết quả là <strong>khóa dự đoán</strong>. Hãy dự đoán sớm trước giờ đấu!
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{totalGroupPredictions}/{groupMatches.length}</div>
          <div className="stat-label">Vòng bảng đã dự đoán</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{totalKnockoutPredictions}/{knockoutMatches.length}</div>
          <div className="stat-label">Loại trực tiếp đã đoán</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{totalPoints}</div>
          <div className="stat-label">Tổng điểm hiện tại</div>
        </div>
      </div>

      {/* Round tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`} onClick={() => setActiveTab('group')}>
          🏟️ Vòng Bảng
        </button>
        {availableRounds.map(r => (
          <button key={r} className={`tab-btn ${activeTab === r ? 'active' : ''}`} onClick={() => setActiveTab(r)}>
            ⚡ {ROUND_LABELS[r] || r}
          </button>
        ))}
        {availableRounds.length === 0 && (
          <button className="tab-btn" disabled style={{ opacity: 0.5, flex: 'none' }}>
            Vòng loại trực tiếp (sắp mở)
          </button>
        )}
      </div>

      {/* Group stage */}
      {activeTab === 'group' && (
        <div>
          {/* Group selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `2px solid ${activeGroup === g ? 'var(--primary)' : 'var(--border)'}`,
                  background: activeGroup === g ? 'var(--primary)' : 'white',
                  color: activeGroup === g ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: 'Oswald',
                  fontWeight: 700,
                  fontSize: 13,
                  transition: 'all 0.2s'
                }}
              >
                Bảng {g}
              </button>
            ))}
          </div>

          {/* Matches for selected group */}
          <div>
            <div className="group-header">
              ⚽ Bảng {activeGroup}
            </div>
            <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius) var(--radius)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)' }}>
                {groupMatches
                  .filter(m => m.group_name === activeGroup)
                  .sort((a, b) => {
                    const aD = a.result !== null ? 1 : 0
                    const bD = b.result !== null ? 1 : 0
                    if (aD !== bD) return aD - bD
                    return new Date(a.match_time) - new Date(b.match_time)
                  })
                  .map(match => (
                    <div key={match.id} style={{ background: 'var(--bg-card)', padding: '12px 16px' }}>
                      <GroupMatchCard
                        match={match}
                        prediction={predictions[match.id]}
                        onPredict={handleGroupPredict}
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knockout rounds */}
      {activeTab !== 'group' && (
        <div>
          <div className="section-header">
            <span className="section-title">⚡ {ROUND_LABELS[activeTab]}</span>
            <span className="section-badge">Vòng loại trực tiếp</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {knockoutMatches
              .filter(m => m.round === activeTab)
              .sort((a, b) => {
                const aD = a.result !== null ? 1 : 0
                const bD = b.result !== null ? 1 : 0
                if (aD !== bD) return aD - bD
                return new Date(a.match_time) - new Date(b.match_time)
              })
              .map(match => (
                <KnockoutMatchCard
                  key={match.id}
                  match={match}
                  prediction={predictions[match.id]}
                  onPredictKnockout={handleKnockoutPredict}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
