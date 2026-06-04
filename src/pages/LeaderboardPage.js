import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../App'

export default function LeaderboardPage() {
  const { player } = useApp()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailPlayer, setDetailPlayer] = useState(null)
  const [details, setDetails] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    loadLeaderboard()
    // Realtime update
    const channel = supabase.channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, loadLeaderboard)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadLeaderboard() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('total_points', { ascending: false })
    setPlayers(data || [])
    setLoading(false)
  }

  async function loadDetail(p) {
    setDetailPlayer(p)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('predictions')
      .select(`*, matches(*)`)
      .eq('player_id', p.id)
      .order('created_at')
    setDetails(data || [])
    setLoadingDetail(false)
  }

  const myRank = players.findIndex(p => p.id === player.id) + 1
  const myPlayer = players.find(p => p.id === player.id)

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Đang tải bảng xếp hạng...</span>
    </div>
  )

  return (
    <div>
      {/* My rank highlight */}
      {myPlayer && (
        <div style={{
          background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          color: 'white',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{ fontSize: 36 }}>
            {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🏅'}
          </div>
          <div>
            <div style={{ fontFamily: 'Oswald', fontSize: 18, fontWeight: 700 }}>
              {myPlayer.name} — Hạng #{myRank}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              {myPlayer.total_points} điểm • Trong số {players.length} người chơi
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Oswald', fontSize: 32, fontWeight: 700 }}>{myPlayer.total_points}</div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>điểm</div>
          </div>
        </div>
      )}

      <div className="section-header">
        <span className="section-title">🏆 Bảng Xếp Hạng</span>
        <span className="section-badge">{players.length} người chơi</span>
      </div>

      <div className="card">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>Hạng</th>
              <th>Tên</th>
              <th style={{ textAlign: 'right', width: 100 }}>Điểm</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const rank = i + 1
              const isMe = p.id === player.id
              return (
                <tr key={p.id} style={{ background: isMe ? 'var(--primary-bg)' : undefined }}>
                  <td>
                    <div className={`rank-badge rank-${rank <= 3 ? rank : 'other'}`}>
                      {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="user-avatar" style={{ background: isMe ? 'var(--primary)' : 'var(--primary-bg)', color: isMe ? 'white' : 'var(--primary)' }}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: isMe ? 700 : 400 }}>
                        {p.name}
                        {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>(Bạn)</span>}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'Oswald', fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                      {p.total_points}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>đ</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => loadDetail(p)}
                      style={{ fontSize: 11 }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {players.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏟️</div>
            <div className="empty-state-title">Chưa có ai tham gia</div>
            <div>Hãy chia sẻ link cho bạn bè!</div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailPlayer && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 16
          }}
          onClick={e => e.target === e.currentTarget && setDetailPlayer(null)}
        >
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
              color: 'white', padding: '16px 20px',
              borderRadius: '16px 16px 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontFamily: 'Oswald', fontSize: 18, fontWeight: 700 }}>{detailPlayer.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Chi tiết dự đoán</div>
              </div>
              <button onClick={() => setDetailPlayer(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>✕ Đóng</button>
            </div>
            <div style={{ padding: 16 }}>
              {loadingDetail ? (
                <div className="loading-center" style={{ padding: 32 }}>
                  <div className="spinner" />
                </div>
              ) : details.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>Chưa có dự đoán nào</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {details.map(pred => {
                    const match = pred.matches
                    if (!match) return null
                    const isGroup = match.round === 'group'
                    return (
                      <div key={pred.id} style={{
                        padding: '10px 12px',
                        background: 'var(--bg)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', gap: 10
                      }}>
                        <div style={{ flex: 1, fontSize: 13 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {match.home_team} vs {match.away_team}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {isGroup
                              ? `Dự đoán: ${pred.predicted_result === 'home' ? match.home_team + ' thắng' : pred.predicted_result === 'draw' ? 'Hòa' : match.away_team + ' thắng'}`
                              : `Đội đi tiếp: ${pred.predicted_winner} | Tỷ số: ${pred.predicted_home_score}-${pred.predicted_away_score}`
                            }
                          </div>
                        </div>
                        {pred.is_scored && (
                          <span className={`points-badge ${pred.points === 7 ? 'p7' : pred.points >= 2 ? 'p2' : 'p0'}`}>
                            {pred.points}đ
                          </span>
                        )}
                        {!pred.is_scored && match.result && (
                          <span style={{ fontSize: 11, color: 'var(--text-light)' }}>chờ tính</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
