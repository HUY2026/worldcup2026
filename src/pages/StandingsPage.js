import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { toVNTime, ROUND_LABELS } from '../lib/utils'

const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'final']

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

// Component bảng xếp hạng 1 group
function GroupTable({ groupName, rows, matches }) {
  const [showMatches, setShowMatches] = useState(false)
  const groupMatches = matches.filter(m => m.group_name === groupName && m.result !== null)

  return (
    <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        padding: '10px 16px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 15 }}>⚽ Bảng {groupName}</span>
        {groupMatches.length > 0 && (
          <button onClick={() => setShowMatches(v => !v)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 12, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
            {showMatches ? '▲ Ẩn kết quả' : `▼ ${groupMatches.length} kết quả`}
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '7px 12px', textAlign: 'left', width: 28, color: 'var(--text-muted)', fontWeight: 600 }}>#</th>
              <th style={{ padding: '7px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Đội</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 32, color: 'var(--text-muted)', fontWeight: 600 }}>TĐ</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 32, color: 'var(--text-muted)', fontWeight: 600 }}>T</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 32, color: 'var(--text-muted)', fontWeight: 600 }}>H</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 32, color: 'var(--text-muted)', fontWeight: 600 }}>B</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 48, color: 'var(--text-muted)', fontWeight: 600 }}>HS</th>
              <th style={{ padding: '7px 8px', textAlign: 'center', width: 36, color: 'var(--text-muted)', fontWeight: 600 }}>HH</th>
              <th style={{ padding: '7px 12px', textAlign: 'center', width: 36, color: 'var(--primary)', fontWeight: 700 }}>Đ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.team} style={{ borderBottom: '1px solid var(--border)', background: i < 2 ? 'rgba(26,111,196,0.04)' : 'white' }}>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                    background: i < 2 ? 'var(--primary)' : 'var(--bg)',
                    color: i < 2 ? 'white' : 'var(--text-muted)'
                  }}>{i + 1}</span>
                </td>
                <td style={{ padding: '9px 12px', fontWeight: i < 2 ? 700 : 400 }}>
                  {row.team}
                  {i < 2 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>▲ ĐI TIẾP</span>}
                </td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.P}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#2ecc71', fontWeight: 600 }}>{row.W}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.D}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#e74c3c' }}>{row.L}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{row.GF}:{row.GA}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 600, color: row.GD > 0 ? '#2ecc71' : row.GD < 0 ? '#e74c3c' : 'var(--text-muted)' }}>
                  {row.GD > 0 ? '+' : ''}{row.GD}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', fontFamily: 'Oswald', fontSize: 17, fontWeight: 700, color: 'var(--primary)' }}>{row.Pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showMatches && groupMatches.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', background: 'var(--bg)' }}>
          {groupMatches.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: m.result === 'home' ? 'var(--text)' : 'var(--text-muted)', fontWeight: m.result === 'home' ? 700 : 400 }}>{m.home_team}</span>
              <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 15, color: 'var(--primary)', margin: '0 8px' }}>{m.home_score} - {m.away_score}</span>
              <span style={{ color: m.result === 'away' ? 'var(--text)' : 'var(--text-muted)', fontWeight: m.result === 'away' ? 700 : 400, textAlign: 'right' }}>{m.away_team}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        TĐ=Trận đã đấu · T/H/B=Thắng/Hòa/Bại · HS=Bàn thắng:bại · HH=Hiệu số · Đ=Điểm
      </div>
    </div>
  )
}

// Component bracket 1 trận
function BracketMatch({ match }) {
  const homeWin = match?.result === 'home'
  const awayWin = match?.result === 'away'
  return (
    <div style={{
      background: 'white', border: '1.5px solid var(--border)', borderRadius: 10,
      overflow: 'hidden', minWidth: 160, flex: 1, maxWidth: 220,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {match ? (
        <>
          <div style={{
            padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            background: homeWin ? 'rgba(26,111,196,0.08)' : 'white',
          }}>
            <span style={{ fontSize: 13, fontWeight: homeWin ? 700 : 400, color: homeWin ? 'var(--primary)' : 'var(--text)' }}>
              {match.home_team || '?'}
            </span>
            {match.result && (
              <span style={{ fontFamily: 'Oswald', fontWeight: 700, color: homeWin ? 'var(--primary)' : 'var(--text-muted)' }}>
                {match.home_score}
              </span>
            )}
          </div>
          <div style={{
            padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: awayWin ? 'rgba(26,111,196,0.08)' : 'white',
          }}>
            <span style={{ fontSize: 13, fontWeight: awayWin ? 700 : 400, color: awayWin ? 'var(--primary)' : 'var(--text)' }}>
              {match.away_team || '?'}
            </span>
            {match.result && (
              <span style={{ fontFamily: 'Oswald', fontWeight: 700, color: awayWin ? 'var(--primary)' : 'var(--text-muted)' }}>
                {match.away_score}
              </span>
            )}
          </div>
          {match.penalty_home !== null && match.penalty_home !== undefined && (
            <div style={{ padding: '3px 12px', fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              🎯 Penalty: {match.penalty_home}–{match.penalty_away}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ padding: '7px 12px', fontSize: 13, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>TBD</div>
          <div style={{ padding: '7px 12px', fontSize: 13, color: 'var(--text-muted)' }}>TBD</div>
        </>
      )}
    </div>
  )
}

// Bracket section cho 1 vòng
function BracketRound({ label, matches, emptyCount }) {
  const total = matches.length + (emptyCount || 0)
  const slots = [...matches]
  while (slots.length < total) slots.push(null)

  return (
    <div style={{ minWidth: 180, flex: 1 }}>
      <div style={{
        textAlign: 'center', fontFamily: 'Oswald', fontWeight: 700, fontSize: 13,
        color: 'var(--primary)', marginBottom: 10, padding: '4px 0',
        borderBottom: '2px solid var(--primary)'
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slots.map((m, i) => <BracketMatch key={i} match={m} />)}
      </div>
    </div>
  )
}

export default function StandingsPage() {
  const [tab, setTab] = useState('groups') // 'groups' | 'bracket'
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState('A')

  useEffect(() => {
    loadMatches()
    const channel = supabase.channel('standings-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadMatches)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').order('match_time')
    setMatches(data || [])
    setLoading(false)
  }

  const groupMatches = matches.filter(m => m.round === 'group')
  const knockoutMatches = matches.filter(m => m.round !== 'group')
  const standings = computeStandings(groupMatches)
  const allGroups = 'ABCDEFGHIJKL'.split('')
  const existingGroups = Object.keys(standings).sort()
  const groups = existingGroups.length > 0 ? existingGroups : allGroups

  // Knockout by round
  const knockoutByRound = {}
  ROUND_ORDER.forEach(r => {
    knockoutByRound[r] = knockoutMatches.filter(m => m.round === r)
  })
  const hasKnockout = knockoutMatches.length > 0

  if (loading) return (
    <div className="loading-center"><div className="spinner" style={{ width: 36, height: 36 }} /><span>Đang tải...</span></div>
  )

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setTab('groups')}
          className={tab === 'groups' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          style={{ flex: 1 }}
        >
          📊 Bảng Xếp Hạng Group
        </button>
        <button
          onClick={() => setTab('bracket')}
          className={tab === 'bracket' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
          style={{ flex: 1 }}
        >
          ⚡ Nhánh Đấu Loại Trực Tiếp
        </button>
      </div>

      {/* ── TAB: BẢNG XẾP HẠNG GROUP ── */}
      {tab === 'groups' && (
        <>
          {/* Group selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {groups.map(g => (
              <button key={g} onClick={() => setSelectedGroup(g)} style={{
                padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: selectedGroup === g ? 'var(--primary)' : 'var(--border)',
                background: selectedGroup === g ? 'var(--primary)' : 'white',
                color: selectedGroup === g ? 'white' : 'var(--text)',
                fontFamily: 'Oswald', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}>Bảng {g}</button>
            ))}
          </div>

          {standings[selectedGroup] ? (
            <>
              <GroupTable groupName={selectedGroup} rows={standings[selectedGroup]} matches={groupMatches} />
              {/* Upcoming matches in group */}
              {(() => {
                const upcoming = groupMatches.filter(m => m.group_name === selectedGroup && m.result === null)
                if (!upcoming.length) return null
                return (
                  <div>
                    <div className="section-header" style={{ marginBottom: 10 }}>
                      <span className="section-title">📋 Lịch sắp đấu — Bảng {selectedGroup}</span>
                    </div>
                    {upcoming.map(m => (
                      <div key={m.id} className="card" style={{ marginBottom: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{m.home_team} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs</span> {m.away_team}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{toVNTime(m.match_time)}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">⏳</div>
              <div className="empty-state-title">Chưa có kết quả bảng {selectedGroup}</div>
              <div style={{ fontSize: 13 }}>Kết quả sẽ hiển thị sau khi trận đấu kết thúc</div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: BRACKET KNOCKOUT ── */}
      {tab === 'bracket' && (
        <>
          {!hasKnockout ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon">⚡</div>
              <div className="empty-state-title">Vòng loại trực tiếp chưa bắt đầu</div>
              <div style={{ fontSize: 13 }}>Chờ kết thúc vòng bảng (sau 29/6/2026)</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
                <div style={{ display: 'flex', gap: 16, minWidth: 600 }}>
                  {ROUND_ORDER.filter(r => knockoutByRound[r]?.length > 0).map(r => (
                    <BracketRound
                      key={r}
                      label={ROUND_LABELS[r] || r}
                      matches={knockoutByRound[r]}
                    />
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                💡 Cuộn ngang để xem toàn bộ nhánh đấu. Đội in đậm = đội thắng.
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
