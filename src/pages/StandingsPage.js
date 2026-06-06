import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { toVNTime } from '../lib/utils'

// ─── Tính bảng xếp hạng vòng bảng ────────────────────────────
function computeStandings(matches) {
  const standings = {}
  matches.forEach(m => {
    if (m.round !== 'group') return
    const g = m.group_name
    if (!standings[g]) standings[g] = {}
    const init = (team) => {
      if (!standings[g][team]) standings[g][team] = { team, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 }
    }
    init(m.home_team); init(m.away_team)
  })
  matches.forEach(m => {
    if (m.round !== 'group' || m.result == null) return
    const g = m.group_name
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

// ─── 1 ô trận đấu trong bracket ──────────────────────────────
function MatchBox({ match, compact = false }) {
  const homeWin = match?.result === 'home'
  const awayWin = match?.result === 'away'
  const h = compact ? 24 : 30
  const fs = compact ? 11 : 12
  const fw = compact ? 600 : 700

  const rowStyle = (isHome) => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: compact ? '3px 8px' : '5px 10px',
    height: h,
    background: (isHome ? homeWin : awayWin) ? 'rgba(26,111,196,0.12)' : 'white',
    borderBottom: isHome ? '1px solid var(--border)' : 'none',
  })

  return (
    <div style={{
      background: 'white',
      border: '1.5px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      minWidth: compact ? 130 : 150,
      maxWidth: compact ? 160 : 190,
      boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
      width: '100%',
    }}>
      {match ? (
        <>
          <div style={rowStyle(true)}>
            <span style={{ fontSize: fs, fontWeight: (homeWin ? fw : 400), color: homeWin ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '78%' }}>
              {match.home_team || '?'}
            </span>
            {match.result != null && (
              <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: fs + 1, color: homeWin ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                {match.home_score}
              </span>
            )}
          </div>
          <div style={rowStyle(false)}>
            <span style={{ fontSize: fs, fontWeight: (awayWin ? fw : 400), color: awayWin ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '78%' }}>
              {match.away_team || '?'}
            </span>
            {match.result != null && (
              <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: fs + 1, color: awayWin ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                {match.away_score}
              </span>
            )}
          </div>
          {match.penalty_home != null && (
            <div style={{ padding: '2px 8px', fontSize: 10, color: 'var(--text-muted)', background: '#fafafa', borderTop: '1px solid var(--border)' }}>
              🎯 {match.penalty_home}–{match.penalty_away}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={rowStyle(true)}><span style={{ fontSize: fs, color: 'var(--text-muted)' }}>TBD</span></div>
          <div style={rowStyle(false)}><span style={{ fontSize: fs, color: 'var(--text-muted)' }}>TBD</span></div>
        </>
      )}
    </div>
  )
}

// ─── Connector SVG giữa các vòng ─────────────────────────────
function Connectors({ count, direction, rowHeight, gap }) {
  // direction: 'right' = nhánh trái (gộp đôi sang phải), 'left' = nhánh phải
  const totalH = count * rowHeight + (count - 1) * gap
  const pairs = Math.floor(count / 2)
  const w = 24

  return (
    <svg width={w} height={totalH} style={{ flexShrink: 0, overflow: 'visible' }}>
      {Array.from({ length: pairs }).map((_, i) => {
        const y1 = i * 2 * (rowHeight + gap) + rowHeight / 2
        const y2 = (i * 2 + 1) * (rowHeight + gap) + rowHeight / 2
        const ymid = (y1 + y2) / 2
        return (
          <g key={i}>
            {/* Nối từ ô trên */}
            {direction === 'right' ? (
              <>
                <line x1={0} y1={y1} x2={w / 2} y2={y1} stroke="var(--border)" strokeWidth={1.5} />
                <line x1={0} y1={y2} x2={w / 2} y2={y2} stroke="var(--border)" strokeWidth={1.5} />
                <line x1={w / 2} y1={y1} x2={w / 2} y2={y2} stroke="var(--border)" strokeWidth={1.5} />
                <line x1={w / 2} y1={ymid} x2={w} y2={ymid} stroke="var(--border)" strokeWidth={1.5} />
              </>
            ) : (
              <>
                <line x1={w} y1={y1} x2={w / 2} y2={y1} stroke="var(--border)" strokeWidth={1.5} />
                <line x1={w} y1={y2} x2={w / 2} y2={y2} stroke="var(--border)" strokeWidth={1.5} />
                <line x1={w / 2} y1={y1} x2={w / 2} y2={y2} stroke="var(--border)" strokeWidth={1.5} />
                <line x1={w / 2} y1={ymid} x2={0} y2={ymid} stroke="var(--border)" strokeWidth={1.5} />
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── 1 cột vòng đấu ──────────────────────────────────────────
function RoundCol({ label, matches, total, rowHeight, gap, compact }) {
  // Điền null cho các slot chưa có trận
  const slots = Array.from({ length: total }, (_, i) => matches[i] || null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: compact ? 140 : 160 }}>
      <div style={{
        textAlign: 'center', fontFamily: 'Oswald', fontWeight: 700,
        fontSize: 11, color: 'var(--primary)', marginBottom: 8,
        padding: '3px 0', borderBottom: '2px solid var(--primary)',
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap, flex: 1 }}>
        {slots.map((m, i) => (
          <div key={i} style={{ height: rowHeight, display: 'flex', alignItems: 'center' }}>
            <MatchBox match={m} compact={compact} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bracket chính ────────────────────────────────────────────
// WC2026: R32=32 trận → R16=16 → QF=8 → SF=4 → Final=1
// Chia đôi: trái (16→8→4→2 rồi vào SF/Final từ trái), phải tương tự
// Layout: [R32-L] [conn] [R16-L] [conn] [QF-L] [conn] [SF-L] [conn] [FINAL] [conn] [SF-R] [conn] [QF-R] [conn] [R16-R] [conn] [R32-R]

function TournamentBracket({ knockoutMatches }) {
  // Phân loại theo vòng
  const byRound = { r32: [], r16: [], qf: [], sf: [], final: [] }
  knockoutMatches.forEach(m => {
    if (byRound[m.round]) byRound[m.round].push(m)
  })

  // Sắp xếp theo match_number hoặc match_time
  const sort = (arr) => [...arr].sort((a, b) => (a.match_number || 0) - (b.match_number || 0) || new Date(a.match_time) - new Date(b.match_time))
  const r32 = sort(byRound.r32)   // tối đa 32 trận
  const r16 = sort(byRound.r16)   // 16
  const qf  = sort(byRound.qf)    // 8
  const sf  = sort(byRound.sf)    // 4
  const fin = sort(byRound.final) // 1

  // Chia đôi: nửa đầu = trái, nửa sau = phải
  const half = (arr, n) => {
    const h = Math.ceil(n / 2)
    return { left: arr.slice(0, h), right: arr.slice(h) }
  }

  const r32h = half(r32, 32); const r16h = half(r16, 16)
  const qfh  = half(qf, 8);   const sfh  = half(sf, 4)

  // Row height và gap cho từng cột (số slot x rowH + gap)
  // R32: 16 slot mỗi bên, R16: 8, QF: 4, SF: 2, Final: 1
  const ROW_H = 68   // chiều cao 1 ô (2 dòng đội + padding)
  const BASE_GAP = 8 // gap tối thiểu

  // Gap tăng dần để các ô căn giữa đúng vị trí
  // R32 gap = BASE_GAP
  // R16 gap = R32: (ROW_H + BASE_GAP) * 2 - ROW_H = ROW_H + 2*BASE_GAP
  const gapFor = (round) => {
    // Số lần gộp đôi từ R32
    const folds = { r32: 0, r16: 1, qf: 2, sf: 3, final: 4 }[round] || 0
    let g = BASE_GAP
    for (let i = 0; i < folds; i++) g = (ROW_H + g) * 2 - ROW_H
    return g
  }

  const rounds = [
    { key: 'r32', label: '1/32', left: r32h.left, right: r32h.right, total: 16 },
    { key: 'r16', label: '1/16', left: r16h.left, right: r16h.right, total: 8 },
    { key: 'qf',  label: 'Tứ Kết', left: qfh.left, right: qfh.right, total: 4 },
    { key: 'sf',  label: 'Bán Kết', left: sfh.left, right: sfh.right, total: 2 },
  ]

  const totalH = 16 * ROW_H + 15 * BASE_GAP + 40 // 40 = label header

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 900 }}>

        {/* ── Nhánh TRÁI: R32 → R16 → QF → SF ── */}
        {rounds.map((r, ri) => (
          <React.Fragment key={r.key + '-left'}>
            <RoundCol
              label={r.label}
              matches={r.left}
              total={r.total}
              rowHeight={ROW_H}
              gap={gapFor(r.key)}
              compact={true}
            />
            <Connectors
              count={r.total}
              direction="right"
              rowHeight={ROW_H}
              gap={gapFor(r.key)}
            />
          </React.Fragment>
        ))}

        {/* ── FINAL ở giữa ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 160, paddingTop: 0 }}>
          <div style={{
            textAlign: 'center', fontFamily: 'Oswald', fontWeight: 700,
            fontSize: 11, color: '#c0a000', marginBottom: 8,
            padding: '3px 0', borderBottom: '2px solid #c0a000',
            textTransform: 'uppercase', letterSpacing: 1, width: '100%',
          }}>
            🏆 Chung Kết
          </div>
          {/* Căn dọc vào giữa toàn bộ bracket */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: (totalH - 40) / 2 - ROW_H / 2 }}>
            <MatchBox match={fin[0] || null} />
          </div>
        </div>

        {/* ── Nhánh PHẢI: SF → QF → R16 → R32 ── */}
        {[...rounds].reverse().map((r, ri) => (
          <React.Fragment key={r.key + '-right'}>
            <Connectors
              count={r.total}
              direction="left"
              rowHeight={ROW_H}
              gap={gapFor(r.key)}
            />
            <RoundCol
              label={r.label}
              matches={r.right}
              total={r.total}
              rowHeight={ROW_H}
              gap={gapFor(r.key)}
              compact={true}
            />
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        💡 Cuộn ngang để xem toàn bộ · Đội in đậm = đội thắng · TBD = chờ xác định
      </div>
    </div>
  )
}

// ─── Bảng Group ───────────────────────────────────────────────
function GroupTable({ groupName, rows, matches }) {
  const [showMatches, setShowMatches] = useState(false)
  const doneMatches = matches.filter(m => m.group_name === groupName && m.result !== null)
  return (
    <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        padding: '10px 16px', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 15 }}>⚽ Bảng {groupName}</span>
        {doneMatches.length > 0 && (
          <button onClick={() => setShowMatches(v => !v)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 12, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
            {showMatches ? '▲ Ẩn kết quả' : `▼ ${doneMatches.length} kết quả`}
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
                  {i < 2 && row.P > 0 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>▲ DẪN ĐẦU</span>}
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
      {showMatches && doneMatches.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', background: 'var(--bg)' }}>
          {doneMatches.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: m.result === 'home' ? 700 : 400 }}>{m.home_team}</span>
              <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 15, color: 'var(--primary)', margin: '0 8px' }}>{m.home_score} - {m.away_score}</span>
              <span style={{ fontWeight: m.result === 'away' ? 700 : 400, textAlign: 'right' }}>{m.away_team}</span>
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

// ─── Main Page ────────────────────────────────────────────────
export default function StandingsPage() {
  const [tab, setTab] = useState('groups')
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
  const groups = 'ABCDEFGHIJKL'.split('').filter(g => standings[g])
  const hasKnockout = knockoutMatches.length > 0

  if (loading) return (
    <div className="loading-center"><div className="spinner" style={{ width: 36, height: 36 }} /><span>Đang tải...</span></div>
  )

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('groups')} className={tab === 'groups' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} style={{ flex: 1 }}>
          📊 Bảng Xếp Hạng Group
        </button>
        <button onClick={() => setTab('bracket')} className={tab === 'bracket' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} style={{ flex: 1 }}>
          ⚡ Nhánh Đấu Loại Trực Tiếp
        </button>
      </div>

      {/* ── TAB: BẢNG XẾP HẠNG GROUP ── */}
      {tab === 'groups' && (
        <>
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
              <div className="empty-state-title">Bảng {selectedGroup} chưa có dữ liệu</div>
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
            <div className="card" style={{ padding: '16px 12px', overflowX: 'auto' }}>
              <TournamentBracket knockoutMatches={knockoutMatches} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
