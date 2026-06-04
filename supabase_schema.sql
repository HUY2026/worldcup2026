-- =============================================
-- WC2026 Predictor - Supabase Schema
-- Chạy file này trong Supabase SQL Editor
-- =============================================

-- Bảng các trận đấu
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round TEXT NOT NULL, -- 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  group_name TEXT, -- 'A', 'B', ... (chỉ dùng cho vòng bảng)
  match_number INT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_time TIMESTAMPTZ NOT NULL, -- Lưu theo UTC, hiển thị GMT+7
  home_score INT, -- null nếu chưa có kết quả
  away_score INT,
  result TEXT, -- 'home' | 'draw' | 'away' (null nếu chưa có)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng người chơi
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  total_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng dự đoán
CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  -- Vòng bảng
  predicted_result TEXT, -- 'home' | 'draw' | 'away'
  -- Vòng loại trực tiếp
  predicted_winner TEXT, -- tên đội thắng
  predicted_home_score INT,
  predicted_away_score INT,
  -- Điểm
  points INT DEFAULT 0,
  is_scored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, match_id)
);

-- Index để query nhanh hơn
CREATE INDEX idx_predictions_player ON predictions(player_id);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_matches_round ON matches(round);
CREATE INDEX idx_matches_time ON matches(match_time);

-- RLS (Row Level Security) - cho phép đọc public
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Policies: cho phép đọc tất cả
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read predictions" ON predictions FOR SELECT USING (true);

-- Policies: cho phép insert/update (dùng anon key)
CREATE POLICY "Public insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert predictions" ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update predictions" ON predictions FOR UPDATE USING (true);
CREATE POLICY "Public update players" ON players FOR UPDATE USING (true);

-- Admin policies cho matches
CREATE POLICY "Public insert matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update matches" ON matches FOR UPDATE USING (true);

-- =============================================
-- Dữ liệu mẫu: 48 trận vòng bảng WC2026
-- (Giờ theo UTC, hiển thị +7 trên app)
-- =============================================

INSERT INTO matches (round, group_name, match_number, home_team, away_team, match_time) VALUES
-- BẢNG A
('group', 'A', 1, 'Mexico', 'Mỹ', '2026-06-11 00:00:00+00'),
('group', 'A', 2, 'Canada', 'Maroc', '2026-06-11 03:00:00+00'),
('group', 'A', 3, 'Mexico', 'Maroc', '2026-06-15 00:00:00+00'),
('group', 'A', 4, 'Canada', 'Mỹ', '2026-06-15 03:00:00+00'),
('group', 'A', 5, 'Canada', 'Mexico', '2026-06-19 22:00:00+00'),
('group', 'A', 6, 'Maroc', 'Mỹ', '2026-06-19 22:00:00+00'),

-- BẢNG B
('group', 'B', 7, 'Argentina', 'Bolivia', '2026-06-12 00:00:00+00'),
('group', 'B', 8, 'Ecuador', 'Chile', '2026-06-12 03:00:00+00'),
('group', 'B', 9, 'Argentina', 'Chile', '2026-06-16 00:00:00+00'),
('group', 'B', 10, 'Ecuador', 'Bolivia', '2026-06-16 03:00:00+00'),
('group', 'B', 11, 'Argentina', 'Ecuador', '2026-06-20 22:00:00+00'),
('group', 'B', 12, 'Chile', 'Bolivia', '2026-06-20 22:00:00+00'),

-- BẢNG C
('group', 'C', 13, 'Pháp', 'Ba Lan', '2026-06-12 00:00:00+00'),
('group', 'C', 14, 'Bỉ', 'Ý', '2026-06-12 03:00:00+00'),
('group', 'C', 15, 'Pháp', 'Ý', '2026-06-16 00:00:00+00'),
('group', 'C', 16, 'Bỉ', 'Ba Lan', '2026-06-16 03:00:00+00'),
('group', 'C', 17, 'Pháp', 'Bỉ', '2026-06-20 22:00:00+00'),
('group', 'C', 18, 'Ý', 'Ba Lan', '2026-06-20 22:00:00+00'),

-- BẢNG D
('group', 'D', 19, 'Brasil', 'Uruguay', '2026-06-13 00:00:00+00'),
('group', 'D', 20, 'Colombia', 'Paraguay', '2026-06-13 03:00:00+00'),
('group', 'D', 21, 'Brasil', 'Paraguay', '2026-06-17 00:00:00+00'),
('group', 'D', 22, 'Colombia', 'Uruguay', '2026-06-17 03:00:00+00'),
('group', 'D', 23, 'Brasil', 'Colombia', '2026-06-21 22:00:00+00'),
('group', 'D', 24, 'Uruguay', 'Paraguay', '2026-06-21 22:00:00+00'),

-- BẢNG E
('group', 'E', 25, 'Đức', 'Nhật Bản', '2026-06-13 00:00:00+00'),
('group', 'E', 26, 'Tây Ban Nha', 'Hà Lan', '2026-06-13 03:00:00+00'),
('group', 'E', 27, 'Đức', 'Hà Lan', '2026-06-17 00:00:00+00'),
('group', 'E', 28, 'Tây Ban Nha', 'Nhật Bản', '2026-06-17 03:00:00+00'),
('group', 'E', 29, 'Đức', 'Tây Ban Nha', '2026-06-21 22:00:00+00'),
('group', 'E', 30, 'Hà Lan', 'Nhật Bản', '2026-06-21 22:00:00+00'),

-- BẢNG F
('group', 'F', 31, 'Bồ Đào Nha', 'Séc', '2026-06-14 00:00:00+00'),
('group', 'F', 32, 'Thổ Nhĩ Kỳ', 'Croatia', '2026-06-14 03:00:00+00'),
('group', 'F', 33, 'Bồ Đào Nha', 'Croatia', '2026-06-18 00:00:00+00'),
('group', 'F', 34, 'Thổ Nhĩ Kỳ', 'Séc', '2026-06-18 03:00:00+00'),
('group', 'F', 35, 'Bồ Đào Nha', 'Thổ Nhĩ Kỳ', '2026-06-22 22:00:00+00'),
('group', 'F', 36, 'Croatia', 'Séc', '2026-06-22 22:00:00+00'),

-- BẢNG G
('group', 'G', 37, 'Anh', 'Serbia', '2026-06-14 00:00:00+00'),
('group', 'G', 38, 'Đan Mạch', 'Slovenia', '2026-06-14 03:00:00+00'),
('group', 'G', 39, 'Anh', 'Slovenia', '2026-06-18 00:00:00+00'),
('group', 'G', 40, 'Đan Mạch', 'Serbia', '2026-06-18 03:00:00+00'),
('group', 'G', 41, 'Anh', 'Đan Mạch', '2026-06-22 22:00:00+00'),
('group', 'G', 42, 'Serbia', 'Slovenia', '2026-06-22 22:00:00+00'),

-- BẢNG H
('group', 'H', 43, 'Hàn Quốc', 'Ghana', '2026-06-15 00:00:00+00'),
('group', 'H', 44, 'Cameroon', 'Saudi Arabia', '2026-06-15 03:00:00+00'),
('group', 'H', 45, 'Hàn Quốc', 'Saudi Arabia', '2026-06-19 00:00:00+00'),
('group', 'H', 46, 'Cameroon', 'Ghana', '2026-06-19 03:00:00+00'),
('group', 'H', 47, 'Hàn Quốc', 'Cameroon', '2026-06-23 22:00:00+00'),
('group', 'H', 48, 'Saudi Arabia', 'Ghana', '2026-06-23 22:00:00+00');

-- Vòng loại trực tiếp sẽ được Admin tạo sau khi vòng bảng kết thúc
-- (Các trận R32, R16, QF, SF, Final)
