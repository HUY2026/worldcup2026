import React, { useState, useEffect } from 'react'
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
      if (!standings[g][team]) standings[g][team] = { team, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0 }
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

// ─── Hằng số layout bracket ──────────────────────────────────
const ROW_H   = 64   // chiều cao 1 ô match
const BASE_GAP = 8   // gap nhỏ nhất (giữa 2 trận R32)
// Tổng chiều cao cố định cho 16 slot R32
const TOTAL_H = 16 * ROW_H + 15 * BASE_GAP  // = 1144

// Gap của vòng có n slot sao cho tổng chiều cao = TOTAL_H
const gapFor = (n) => n === 1 ? 0 : (TOTAL_H - n * ROW_H) / (n - 1)

// paddingTop của cột để căn tâm ô[0] với tâm cặp ô vòng trước
// r32: pt=0, r16: pt=ROW_H/2+gap_r32/2, qf: pt_r16+ROW_H/2+gap_r16/2, ...
const paddingTopFor = (() => {
  const rounds = [
    { key: 'r32', n: 16 },
    { key: 'r16', n: 8  },
    { key: 'qf',  n: 4  },
    { key: 'sf',  n: 2  },
    { key: 'final', n: 1 },
  ]
  const pts = { r32: 0 }
  let pt = 0
  for (let i = 0; i < rounds.length - 1; i++) {
    const { key, n } = rounds[i]
    const g = gapFor(n)
    pt = pt + ROW_H / 2 + g / 2
    pts[rounds[i + 1].key] = pt
  }
  return pts
})()

// ─── 1 ô trận đấu ────────────────────────────────────────────
function MatchBox({ match }) {
  const homeWin = match?.result === 'home'
  const awayWin = match?.result === 'away'
  return (
    <div style={{
      background: 'white', border: '1.5px solid var(--border)', borderRadius: 8,
      overflow: 'hidden', width: '100%',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    }}>
      {match ? (
        <>
          {[
            { team: match.home_team, score: match.home_score, win: homeWin },
            { team: match.away_team, score: match.away_score, win: awayWin },
          ].map(({ team, score, win }, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 8px', height: ROW_H / 2 - (match.penalty_home != null ? 6 : 2),
              background: win ? 'rgba(26,111,196,0.10)' : 'white',
              borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{
                fontSize: 11, fontWeight: win ? 700 : 400,
                color: win ? 'var(--primary)' : 'var(--text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '78%',
              }}>{team || '?'}</span>
              {match.result != null && (
                <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 13, color: win ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                  {score}
                </span>
              )}
            </div>
          ))}
          {match.penalty_home != null && (
            <div style={{ padding: '1px 8px', fontSize: 9, color: 'var(--text-muted)', background: '#fafafa', borderTop: '1px solid var(--border)' }}>
              🎯 pen: {match.penalty_home}–{match.penalty_away}
            </div>
          )}
        </>
      ) : (
        <>
          {[0,1].map(i => (
            <div key={i} style={{
              padding: '4px 8px', height: ROW_H / 2 - 2,
              fontSize: 11, color: 'var(--text-light)',
              borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center',
            }}>TBD</div>
          ))}
        </>
      )}
    </div>
  )
}

// ─── 1 cột vòng đấu (trái hoặc phải) ─────────────────────────
function RoundCol({ roundKey, label, matches, totalSlots, isGold }) {
  const gap   = gapFor(totalSlots)
  const padTop = paddingTopFor[roundKey] || 0
  const slots = Array.from({ length: totalSlots }, (_, i) => matches[i] || null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 150, maxWidth: 175, flex: '0 0 auto' }}>
      {/* Header */}
      <div style={{
        textAlign: 'center', fontFamily: 'Oswald', fontWeight: 700, fontSize: 11,
        color: isGold ? '#b07800' : 'var(--primary)',
        padding: '3px 0', marginBottom: 6,
        borderBottom: `2px solid ${isGold ? '#c0a000' : 'var(--primary)'}`,
        textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {label}
      </div>
      {/* Slots */}
      <div style={{ paddingTop: padTop, display: 'flex', flexDirection: 'column', gap }}>
        {slots.map((m, i) => (
          <div key={i} style={{ height: ROW_H }}>
            <MatchBox match={m} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Connector SVG ────────────────────────────────────────────
// Nối n ô của cột trước thành n/2 ô cột sau
// direction: 'right' = cột bên trái bracket (gộp sang phải)
//            'left'  = cột bên phải bracket (gộp sang trái)
function Connector({ fromSlots, fromRoundKey, direction }) {
  const W = 20
  const gap = gapFor(fromSlots)
  const padTop = paddingTopFor[fromRoundKey] || 0
  const pairs = fromSlots / 2
  const svgH = TOTAL_H + 30 // thêm buffer

  const lines = []
  for (let i = 0; i < pairs; i++) {
    // tâm của ô trên và ô dưới (trong cặp i)
    const y1 = padTop + (i * 2)     * (ROW_H + gap) + ROW_H / 2
    const y2 = padTop + (i * 2 + 1) * (ROW_H + gap) + ROW_H / 2
    const ym = (y1 + y2) / 2

    if (direction === 'right') {
      // từ phải ô => vào giữa => ra phải
      lines.push(
        <line key={`a${i}`} x1={0} y1={y1} x2={W/2} y2={y1} stroke="var(--border)" strokeWidth={1.5}/>,
        <line key={`b${i}`} x1={0} y1={y2} x2={W/2} y2={y2} stroke="var(--border)" strokeWidth={1.5}/>,
        <line key={`c${i}`} x1={W/2} y1={y1} x2={W/2} y2={y2} stroke="var(--border)" strokeWidth={1.5}/>,
        <line key={`d${i}`} x1={W/2} y1={ym}  x2={W}   y2={ym}  stroke="var(--border)" strokeWidth={1.5}/>,
      )
    } else {
      // từ trái ô => vào giữa => ra trái
      lines.push(
        <line key={`a${i}`} x1={W}   y1={y1} x2={W/2} y2={y1} stroke="var(--border)" strokeWidth={1.5}/>,
        <line key={`b${i}`} x1={W}   y1={y2} x2={W/2} y2={y2} stroke="var(--border)" strokeWidth={1.5}/>,
        <line key={`c${i}`} x1={W/2} y1={y1} x2={W/2} y2={y2} stroke="var(--border)" strokeWidth={1.5}/>,
        <line key={`d${i}`} x1={W/2} y1={ym}  x2={0}   y2={ym}  stroke="var(--border)" strokeWidth={1.5}/>,
      )
    }
  }

  return (
    <svg width={W} height={svgH} style={{ flexShrink: 0, overflow: 'visible', alignSelf: 'flex-start', marginTop: 28 }}>
      {lines}
    </svg>
  )
}

// ─── Bracket chính ────────────────────────────────────────────
function TournamentBracket({ knockoutMatches }) {
  const byRound = { r32:[], r16:[], qf:[], sf:[], final:[] }
  knockoutMatches.forEach(m => { if (byRound[m.round]) byRound[m.round].push(m) })
  const sort = arr => [...arr].sort((a,b) => (a.match_number||0)-(b.match_number||0) || new Date(a.match_time)-new Date(b.match_time))

  const r32 = sort(byRound.r32)
  const r16 = sort(byRound.r16)
  const qf  = sort(byRound.qf)
  const sf  = sort(byRound.sf)
  const fin = sort(byRound.final)

  // Chia đôi: nửa đầu trái, nửa sau phải
  const L = (arr, total) => arr.slice(0, total/2)
  const R = (arr, total) => arr.slice(total/2)

  // Cấu hình từng vòng
  const leftRounds = [
    { key:'r32', label:'1/32',    matches: L(r32,32), total: 16 },
    { key:'r16', label:'1/16',    matches: L(r16,16), total: 8  },
    { key:'qf',  label:'Tứ Kết', matches: L(qf,8),  total: 4  },
    { key:'sf',  label:'Bán Kết',matches: L(sf,4),  total: 2  },
  ]
  const rightRounds = [
    { key:'sf',  label:'Bán Kết',matches: R(sf,4),  total: 2  },
    { key:'qf',  label:'Tứ Kết', matches: R(qf,8),  total: 4  },
    { key:'r16', label:'1/16',    matches: R(r16,16), total: 8  },
    { key:'r32', label:'1/32',    matches: R(r32,32), total: 16 },
  ]

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 1100 }}>

        {/* Nhánh TRÁI */}
        {leftRounds.map((r, ri) => (
          <React.Fragment key={r.key+'-L'+ri}>
            <RoundCol roundKey={r.key} label={r.label} matches={r.matches} totalSlots={r.total} />
            <Connector fromSlots={r.total} fromRoundKey={r.key} direction="right" />
          </React.Fragment>
        ))}

        {/* CHUNG KẾT */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 165, flex: '0 0 auto' }}>
          <div style={{
            textAlign: 'center', fontFamily: 'Oswald', fontWeight: 700, fontSize: 11,
            color: '#b07800', padding: '3px 0', marginBottom: 6,
            borderBottom: '2px solid #c0a000',
            textTransform: 'uppercase', letterSpacing: 1,
          }}>🏆 Chung Kết</div>
          <div style={{
            paddingTop: paddingTopFor['final'],
            height: ROW_H,
          }}>
            <MatchBox match={fin[0] || null} />
          </div>
        </div>

        {/* Nhánh PHẢI */}
        {rightRounds.map((r, ri) => (
          <React.Fragment key={r.key+'-R'+ri}>
            <Connector fromSlots={r.total} fromRoundKey={r.key} direction="left" />
            <RoundCol roundKey={r.key} label={r.label} matches={r.matches} totalSlots={r.total} />
          </React.Fragment>
        ))}

      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        💡 Cuộn ngang để xem toàn bộ · Đội <strong>in đậm</strong> = đội thắng
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

  const groupMatches   = matches.filter(m => m.round === 'group')
  const knockoutMatches = matches.filter(m => m.round !== 'group')
  const standings = computeStandings(groupMatches)
  const groups = 'ABCDEFGHIJKL'.split('').filter(g => standings[g])
  const hasKnockout = knockoutMatches.length > 0

  if (loading) return (
    <div className="loading-center"><div className="spinner" style={{ width:36, height:36 }} /><span>Đang tải...</span></div>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('groups')} className={tab === 'groups' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} style={{ flex: 1 }}>
          📊 Bảng Xếp Hạng Group
        </button>
        <button onClick={() => setTab('bracket')} className={tab === 'bracket' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'} style={{ flex: 1 }}>
          ⚡ Nhánh Đấu Loại Trực Tiếp
        </button>
      </div>

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
