// Vercel Serverless Function — proxy gọi football-data.org từ server
// để tránh lỗi CORS khi gọi trực tiếp từ browser.
// Endpoint: /api/live-scores

export default async function handler(req, res) {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '0d77e55ca511412a93e5ea56e5204b0c'

  try {
    // Thử lấy trận đang LIVE (IN_PLAY/PAUSED)
    let r = await fetch('https://api.football-data.org/v4/competitions/WC/matches?status=LIVE', {
      headers: { 'X-Auth-Token': API_KEY },
    })

    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: 'football-data.org error', status: r.status, detail: text })
    }

    let data = await r.json()
    let matches = data?.matches || []

    // Fallback: nếu không có trận LIVE, lấy lịch hôm nay và lọc IN_PLAY/PAUSED
    if (matches.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      r = await fetch(`https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${today}&dateTo=${today}`, {
        headers: { 'X-Auth-Token': API_KEY },
      })
      if (r.ok) {
        data = await r.json()
        matches = (data?.matches || []).filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
      }
    }

    // Cache 30s ở edge/CDN để giảm số lần gọi football-data.org
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
    return res.status(200).json({ matches })
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message })
  }
}
