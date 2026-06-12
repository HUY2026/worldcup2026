// Vercel Serverless Function — proxy CHUNG cho mọi request tới football-data.org
// để tránh lỗi CORS khi gọi trực tiếp từ browser (account free chỉ allow CORS từ localhost).
//
// Cách dùng từ frontend:
//   fetch('/api/football-data?status=FINISHED')
//   fetch('/api/football-data?status=LIVE')
//   fetch('/api/football-data?dateFrom=2026-06-12&dateTo=2026-06-12')
//
// Mọi query param sẽ được forward nguyên vẹn tới:
//   https://api.football-data.org/v4/competitions/WC/matches

export default async function handler(req, res) {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '0d77e55ca511412a93e5ea56e5204b0c'

  try {
    const params = new URLSearchParams(req.query).toString()
    const url = `https://api.football-data.org/v4/competitions/WC/matches${params ? '?' + params : ''}`

    const r = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } })
    const data = await r.json()

    if (!r.ok) {
      return res.status(r.status).json(data)
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message })
  }
}
