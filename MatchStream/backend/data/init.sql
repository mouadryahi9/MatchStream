CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  sport VARCHAR(100) NOT NULL,
  league VARCHAR(255),
  home_team VARCHAR(255),
  away_team VARCHAR(255),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  external_id VARCHAR(255) UNIQUE,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'starting', 'running', 'error', 'stopped')),
  hls_url TEXT,
  stream_type VARCHAR(50) DEFAULT 'hls',
  worker_id VARCHAR(255),
  pid INTEGER,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  error_message TEXT,
  restart_count INTEGER DEFAULT 0,
  max_restarts INTEGER DEFAULT 5,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stream_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_type VARCHAR(50) NOT NULL DEFAULT 'url',
  headers JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  source VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'banner' CHECK (type IN ('banner', 'video', 'popup', 'native')),
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  position VARCHAR(50) DEFAULT 'sidebar',
  is_active BOOLEAN DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_start_time ON matches(start_time);
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);
CREATE INDEX IF NOT EXISTS idx_matches_sport ON matches(sport);
CREATE INDEX IF NOT EXISTS idx_streams_match_id ON streams(match_id);
CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON ads(is_active);

INSERT INTO users (email, username, password_hash, role) VALUES
  ('admin@matchstream.com', 'admin', '$2a$12$9W3GSMf62rc.altRYFDIIuUZAQQTatj5jhiqroW9ppfm76WxsS.Au', 'admin')
ON CONFLICT (email) DO NOTHING;
