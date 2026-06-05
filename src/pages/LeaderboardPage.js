import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../App'

// Tính bảng xếp hạng các đội từ kết quả trận đấu
function computeStandings(matches) {
  const standings = {}
  matches.forEach(m => {
    if (m.round !== 'group' || m.result == null) return
    const g = m.group_name
    if (!standings[g]) standings[g] = {}
    const init = (team) => {
      if (!standings[g][team]) standings[g][team] = { team, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }
    }
    init(m.home_team); init(m.away_team)
    const h = standings[g][m.home_team], a = standings[g][m.away_team]
    h.P++; a.P++
    h.GF += m.home_score ?? 0; h.GA += m.away_score ?? 0
    a.GF += m.away_score ?? 0; a.GA += m.home_score ?? 0
    if (m.result === 'home')      { h.W++; h.Pts += 3; a.L++ }
    else if (m.result === 'away') { a.W++; a.Pts += 3; h.L++ }
    else                          { h.D++; a.D++; h.Pts++; a.Pts++ }
    h.GD = h.GF - h.GA; a.GD = a.GF - a.GA
  })
  const result = {}
  Object.keys(standings).sort().forEach(g => {
    result[g] = Object.values(standings[g]).sort((a, b) =>
      b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.localeCompare(b.team)
    )
  })
  return result
}

export default function LeaderboardPage() {
  const { player } = useApp()
  const [tab, setTab] = useState('players')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailPlayer, setDetailPlayer] = useState(null)
  const [details, setDetails] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [matches, setMatches] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('A')

  useEffect(() => {
    loadLeaderboard()
    loadMatches()
    const channel = supabase.channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, loadLeaderboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadMatches)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadLeaderboard() {
    const { data } = await supabase.from('players').select('*').order('total_points', { ascending: false })
    setPlayers(data || [])
    setLoading(false)
  }

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').eq('round', 'group').order('match_number')
    setMatches(data || [])
  }

  async function loadDetail(p) {
    setDetailPlayer(p)
    setLoadingDetail(true)
    const { data } = await supabase.from('predictions').select(`*, matches(*)`).eq('player_id', p.id).order('created_at')
    setDetails(data || [])
    setLoadingDetail(false)
  }

  const myRank = players.findIndex(p => p.id === player.id) + 1
  const myPlayer = players.find(p => p.id === player.id)
  const standings = computeStandings(matches)
  const groups = Object.keys(standings).length > 0 ? Object.keys(standings) : 'ABCDEFGHIJKL'.split('')

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span>Đang tải...</span>
    </div>
  )

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab('players')}
          className={tab === 'players' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          style={{ flex: 1 }}
        >
          🏆 Xếp Hạng Người Chơi
        </button>
        <button
          onClick={() => setTab('groups')}
          className={tab === 'groups' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          style={{ flex: 1 }}
        >
          ⚽ Bảng Đấu
        </button>
      </div>

      {/* ── TAB: NGƯỜI CHƠI ── */}
      {tab === 'players' && (
        <>
          {myPlayer && (
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
              borderRadius: 'var(--radius)', padding: '16px 20px', color: 'white',
              marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16
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
                        <button className="btn btn-outline btn-sm" onClick={() => loadDetail(p)} style={{ fontSize: 11 }}>
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
        </>
      )}

      {/* ── TAB: BẢNG ĐẤU ── */}
      {tab === 'groups' && (
        <>
          {/* Group selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                  borderColor: selectedGroup === g ? 'var(--primary)' : 'var(--border)',
                  background: selectedGroup === g ? 'var(--primary)' : 'white',
                  color: selectedGroup === g ? 'white' : 'var(--text)',
                  fontFamily: 'Oswald', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                }}
              >
                Bảng {g}
              </button>
            ))}
          </div>

          {/* Standing table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
              padding: '12px 16px', color: 'white',
              fontFamily: 'Oswald', fontWeight: 700, fontSize: 16
            }}>
              ⚽ Bảng {selectedGroup}
            </div>

            {standings[selectedGroup] ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', width: 30 }}>#</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Đội</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', width: 36 }}>TĐ</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', width: 36 }}>T</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', width: 36 }}>H</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', width: 36 }}>B</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', width: 50 }}>HS</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', width: 40 }}>HH</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--primary)', width: 44 }}>Đ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings[selectedGroup].map((row, i) => (
                      <tr key={row.team} style={{
                        borderBottom: '1px solid var(--border)',
                        background: i < 2 ? 'rgba(26,111,196,0.04)' : 'white'
                      }}>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                            background: i < 2 ? 'var(--primary)' : 'var(--bg)',
                            color: i < 2 ? 'white' : 'var(--text-muted)'
                          }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: i < 2 ? 700 : 400, color: 'var(--text)' }}>
                          {row.team}
                          {i < 2 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>▲ ĐI TIẾP</span>}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.P}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#2ecc71', fontWeight: 600 }}>{row.W}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.D}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#e74c3c' }}>{row.L}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.GF}:{row.GA}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: row.GD > 0 ? '#2ecc71' : row.GD < 0 ? '#e74c3c' : 'var(--text-muted)', fontWeight: 600 }}>
                          {row.GD > 0 ? '+' : ''}{row.GD}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'Oswald', fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                          {row.Pts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                  TĐ = Trận đã đấu · T/H/B = Thắng/Hòa/Bại · HS = Hiệu số bàn thắng · HH = Hiệu hiệu số · Đ = Điểm
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-title">Chưa có kết quả</div>
                <div style={{ fontSize: 13 }}>Bảng {selectedGroup} chưa có trận nào có kết quả</div>
              </div>
            )}
          </div>

          {/* Matches in this group */}
          <div style={{ marginTop: 16 }}>
            <div className="section-header">
              <span className="section-title">📋 Lịch thi đấu — Bảng {selectedGroup}</span>
            </div>
            {matches.filter(m => m.group_name === selectedGroup).map(m => (
              <div key={m.id} className="card" style={{ marginBottom: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {m.home_team} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.away_team}
                  </div>
                  {m.result != null ? (
                    <div style={{ fontFamily: 'Oswald', fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                      {m.home_score} - {m.away_score}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chưa đấu</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail modal */}
      {detailPlayer && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setDetailPlayer(null)}
        >
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', color: 'white', padding: '16px 20px', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'Oswald', fontSize: 18, fontWeight: 700 }}>{detailPlayer.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Chi tiết dự đoán</div>
              </div>
              <button onClick={() => setDetailPlayer(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>✕ Đóng</button>
            </div>
            <div style={{ padding: 16 }}>
              {loadingDetail ? (
                <div className="loading-center" style={{ padding: 32 }}><div className="spinner" /></div>
              ) : details.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>Chưa có dự đoán nào</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {details.map(pred => {
                    const match = pred.matches
                    if (!match) return null
                    const isGroup = match.round === 'group'
                    return (
                      <div key={pred.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
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
