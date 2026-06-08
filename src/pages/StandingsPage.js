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

// ─── Layout bracket dùng SVG tọa độ tuyệt đối ───────────────
// R32=8 slot/nhánh, R16=4, QF=2, SF=1 → 16 trận R32 tổng
const BK = {
  ROW_H: 60, BOX_W: 148, COL_W: 180, HEADER_H: 26,
  // gap đệ quy: gap_next = ROW_H + 2*gap_prev  (đảm bảo căn giữa chính xác)
  gap:  { r32: 10, r16: 80, qf: 220, sf: 500, final: 0 },
  // paddingTop: pt_next = pt_prev + 0.5*(ROW_H + gap_prev)
  pt:   { r32: 0,  r16: 35, qf: 105, sf: 245, final: 245 },
  slots:{ r32: 8,  r16: 4,  qf: 2,   sf: 1,   final: 1 },
}
// 9 cột: R32L(0) R16L(1) QFL(2) SFL(3) FINAL(4) SFR(5) QFR(6) R16R(7) R32R(8)
const bkX  = (col) => col * BK.COL_W
const bkCY = (round, i) => BK.pt[round] + i * (BK.ROW_H + BK.gap[round]) + BK.ROW_H / 2
const SVG_W = BK.COL_W * 8 + BK.BOX_W
// Chiều cao phải cover cột R32 (cao nhất): 8 slot × (ROW_H+gap) + HEADER_H + padding
const SVG_H = BK.HEADER_H + BK.pt.r32 + 8*(BK.ROW_H+BK.gap.r32) - BK.gap.r32 + 20

// MatchBox dùng foreignObject
function BkMatchBox({ x, y, match }) {
  const hw = match?.result === 'home', aw = match?.result === 'away'
  return (
    <foreignObject x={x} y={y + BK.HEADER_H} width={BK.BOX_W} height={BK.ROW_H}>
      <div xmlns="http://www.w3.org/1999/xhtml" style={{
        border: '1.5px solid #d1dae8', borderRadius: 7, overflow: 'hidden',
        background: 'white', height: BK.ROW_H, display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      }}>
        {match ? [
          { team: match.home_team, score: match.home_score, win: hw },
          { team: match.away_team, score: match.away_score, win: aw },
        ].map(({ team, score, win }, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '2px 7px', background: win ? 'rgba(26,111,196,0.10)' : 'white',
            borderBottom: i === 0 ? '1px solid #d1dae8' : 'none',
          }}>
            <span style={{ fontSize: 11, fontWeight: win ? 700 : 400, color: win ? '#1a6fc4' : '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '78%' }}>
              {team || '?'}
            </span>
            {match.result != null && (
              <span style={{ fontSize: 13, fontFamily: 'Oswald,sans-serif', fontWeight: 700, color: win ? '#1a6fc4' : '#9ca3af', flexShrink: 0 }}>{score}</span>
            )}
          </div>
        )) : [0,1].map(i => (
          <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '2px 7px', borderBottom: i===0?'1px solid #d1dae8':'none', fontSize: 11, color: '#c0c8d5' }}>TBD</div>
        ))}
      </div>
    </foreignObject>
  )
}

// Header text cho 1 cột
function BkHeader({ x, label, isGold }) {
  const color = isGold ? '#b07800' : '#1a6fc4'
  return (
    <>
      <line x1={x} y1={20} x2={x + BK.BOX_W} y2={20} stroke={color} strokeWidth={2}/>
      <text x={x + BK.BOX_W/2} y={13} textAnchor="middle" fontSize={10}
        fontFamily="Oswald,sans-serif" fontWeight={700} fill={color}
        style={{ textTransform:'uppercase', letterSpacing:0.5 }}>
        {label}
      </text>
    </>
  )
}

// Connector lines: nối pairs từ vòng `round` sang vòng kế
// dir 'r'=nhánh trái (lines ra phải), dir 'l'=nhánh phải (lines ra trái)
function BkConnectors({ round, fromColIdx, toColIdx, dir }) {
  const n = BK.slots[round], pairs = n / 2
  const x1 = dir==='r' ? bkX(fromColIdx)+BK.BOX_W : bkX(fromColIdx)
  const x2 = dir==='r' ? bkX(toColIdx)             : bkX(toColIdx)+BK.BOX_W
  const xm = (x1 + x2) / 2
  return (
    <>
      {Array.from({length: pairs}, (_,i) => {
        const y1 = bkCY(round, i*2)   + BK.HEADER_H
        const y2 = bkCY(round, i*2+1) + BK.HEADER_H
        const ym = (y1+y2)/2
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={xm} y2={y1} stroke="#d1dae8" strokeWidth={1.5}/>
            <line x1={x1} y1={y2} x2={xm} y2={y2} stroke="#d1dae8" strokeWidth={1.5}/>
            <line x1={xm} y1={y1} x2={xm} y2={y2} stroke="#d1dae8" strokeWidth={1.5}/>
            <line x1={xm} y1={ym} x2={x2} y2={ym} stroke="#d1dae8" strokeWidth={1.5}/>
          </g>
        )
      })}
    </>
  )
}

// ─── Bracket chính ────────────────────────────────────────────
function TournamentBracket({ knockoutMatches }) {
  const byRound = { r32:[], r16:[], qf:[], sf:[], final:[] }
  knockoutMatches.forEach(m => { if (byRound[m.round]) byRound[m.round].push(m) })
  const sort = arr => [...arr].sort((a,b) => (a.match_number||0)-(b.match_number||0) || new Date(a.match_time)-new Date(b.match_time))

  const r32=sort(byRound.r32), r16=sort(byRound.r16)
  const qf=sort(byRound.qf),   sf=sort(byRound.sf)
  const fin=sort(byRound.final)

  // match_number 1-8 = nhánh trái, 9-16 = nhánh phải
  // Nếu chưa có match_number thì chia theo thứ tự sort
  const L = (arr, total) => arr.filter(m => !m.match_number || m.match_number <= total/2)
    .concat(arr.filter(m => m.match_number && m.match_number <= total/2 ? false : !m.match_number ? false : true).filter(m => m.match_number <= total/2))
    .slice(0, total/2)
  const R = (arr, total) => arr.filter(m => m.match_number > total/2)
    .concat(arr.filter(m => !m.match_number).slice(Math.floor(arr.filter(m => m.match_number <= total/2).length)))
    .slice(0, total/2)

  // Đơn giản hơn: sort theo match_number rồi slice
  const lSlice = (arr, total) => {
    const sorted = [...arr].sort((a,b)=>(a.match_number||99)-(b.match_number||99))
    return sorted.slice(0, total/2)
  }
  const rSlice = (arr, total) => {
    const sorted = [...arr].sort((a,b)=>(a.match_number||99)-(b.match_number||99))
    return sorted.slice(total/2)
  }

  const cols = [
    // nhánh trái
    { key:'r32', colIdx:0, label:'1/32',   ms: lSlice(r32,16), dir:'r', nextCol:1 },
    { key:'r16', colIdx:1, label:'1/16',   ms: lSlice(r16,8),  dir:'r', nextCol:2 },
    { key:'qf',  colIdx:2, label:'Tứ Kết', ms: lSlice(qf,4),  dir:'r', nextCol:3 },
    { key:'sf',  colIdx:3, label:'Bán Kết',ms: lSlice(sf,2),  dir:'r', nextCol:4 },
    // nhánh phải (ngược)
    { key:'sf',  colIdx:5, label:'Bán Kết',ms: rSlice(sf,2),  dir:'l', nextCol:4 },
    { key:'qf',  colIdx:6, label:'Tứ Kết', ms: rSlice(qf,4),  dir:'l', nextCol:5 },
    { key:'r16', colIdx:7, label:'1/16',   ms: rSlice(r16,8), dir:'l', nextCol:6 },
    { key:'r32', colIdx:8, label:'1/32',   ms: rSlice(r32,16),dir:'l', nextCol:7 },
  ]

  return (
    <div style={{ overflowX:'auto', paddingBottom:12 }}>
      <svg width={SVG_W} height={SVG_H} style={{ display:'block' }}>
        {/* Headers */}
        {cols.map((c,i) => <BkHeader key={`h${i}`} x={bkX(c.colIdx)} label={c.label} />)}
        <BkHeader x={bkX(4)} label="🏆 Chung Kết" isGold />

        {/* Connectors (vẽ trước, nằm dưới boxes) */}
        {cols.filter(c => c.key !== 'final').map((c,i) => (
          <BkConnectors key={`cn${i}`} round={c.key} fromColIdx={c.colIdx} toColIdx={c.nextCol} dir={c.dir}/>
        ))}
        {/* SF trái → Final */}
        <line x1={bkX(3)+BK.BOX_W} y1={bkCY('sf',0)+BK.HEADER_H} x2={bkX(4)} y2={bkCY('sf',0)+BK.HEADER_H} stroke="#d1dae8" strokeWidth={1.5}/>
        {/* SF phải → Final */}
        <line x1={bkX(5)} y1={bkCY('sf',0)+BK.HEADER_H} x2={bkX(4)+BK.BOX_W} y2={bkCY('sf',0)+BK.HEADER_H} stroke="#d1dae8" strokeWidth={1.5}/>

        {/* Match boxes */}
        {cols.map((c,ci) =>
          Array.from({length: BK.slots[c.key]}, (_,i) => (
            <BkMatchBox key={`${c.key}-${c.dir}-${i}`}
              x={bkX(c.colIdx)}
              y={BK.pt[c.key] + i*(BK.ROW_H+BK.gap[c.key])}
              match={c.ms[i]||null}
            />
          ))
        )}
        {/* Final */}
        <BkMatchBox x={bkX(4)} y={BK.pt.final} match={fin[0]||null} />
      </svg>
      <div style={{ marginTop:8, fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
        💡 Cuộn ngang để xem toàn bộ · Đội <strong>in đậm</strong> = đội thắng · Ô 1–8=nhánh trái, 9–16=nhánh phải
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
                const done = groupMatches.filter(m => m.group_name === selectedGroup && m.result !== null)
                  .sort((a, b) => new Date(b.match_time) - new Date(a.match_time))
                return (
                  <>
                    {upcoming.length > 0 && (
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
                    )}
                    {done.length > 0 && (
                      <div style={{ marginTop: upcoming.length > 0 ? 16 : 0 }}>
                        <div className="section-header" style={{ marginBottom: 10 }}>
                          <span className="section-title">✅ Kết quả đã đấu — Bảng {selectedGroup}</span>
                        </div>
                        {done.map(m => {
                          const homeWin = m.result === 'home', awayWin = m.result === 'away'
                          return (
                            <div key={m.id} className="card" style={{ marginBottom: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: homeWin ? 700 : 400, fontSize: 13, color: homeWin ? 'var(--primary)' : 'var(--text)', flex: 1 }}>{m.home_team}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 12px' }}>
                                <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, color: homeWin ? 'var(--primary)' : 'var(--text-muted)' }}>{m.home_score}</span>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>-</span>
                                <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: 18, color: awayWin ? 'var(--primary)' : 'var(--text-muted)' }}>{m.away_score}</span>
                              </div>
                              <span style={{ fontWeight: awayWin ? 700 : 400, fontSize: 13, color: awayWin ? 'var(--primary)' : 'var(--text)', flex: 1, textAlign: 'right' }}>{m.away_team}</span>
                              <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--text-muted)' }}>{toVNTime(m.match_time)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
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
