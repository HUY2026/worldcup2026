// Chuyển UTC sang giờ Việt Nam (GMT+7)
export function toVNTime(utcString) {
  const date = new Date(utcString)
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toVNDate(utcString) {
  const date = new Date(utcString)
  return date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function toVNTimeOnly(utcString) {
  const date = new Date(utcString)
  return date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Kiểm tra trận đã bắt đầu chưa (so sánh với giờ hiện tại)
export function isMatchLocked(matchTime) {
  return new Date() >= new Date(matchTime)
}

// Tính điểm cho 1 dự đoán
export function calculatePoints(prediction, match) {
  if (!match.result) return 0

  if (match.round === 'group') {
    // Vòng bảng: đúng T/H/B = 2đ
    return prediction.predicted_result === match.result ? 2 : 0
  } else {
    // Vòng loại trực tiếp
    const correctWinner = prediction.predicted_winner === getWinner(match)
    if (!correctWinner) return 0

    // Đúng kết quả (đội thắng đúng) = 3đ
    let points = 3

    // Đúng cả tỷ số = thêm 4đ (tổng 7đ)
    if (
      prediction.predicted_home_score === match.home_score &&
      prediction.predicted_away_score === match.away_score
    ) {
      points = 7
    }

    return points
  }
}

export function getWinner(match) {
  if (match.result === 'home') return match.home_team
  if (match.result === 'away') return match.away_team
  return null
}

export const ROUND_LABELS = {
  group: 'Vòng Bảng',
  r32: 'Vòng 1/32',
  r16: 'Vòng 1/16',
  qf: 'Tứ Kết',
  sf: 'Bán Kết',
  final: 'Chung Kết',
}

export const ROUND_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'final']

export function groupMatchesByGroup(matches) {
  const groups = {}
  matches.forEach(m => {
    const key = m.group_name || 'Khác'
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  })
  return groups
}

export function groupMatchesByDate(matches) {
  const byDate = {}
  matches.forEach(m => {
    const dateKey = toVNDate(m.match_time)
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(m)
  })
  return byDate
}
