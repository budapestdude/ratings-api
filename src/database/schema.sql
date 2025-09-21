-- Players table storing basic player information
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fide_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    federation TEXT,
    sex TEXT,
    title TEXT,
    w_title TEXT,
    o_title TEXT,
    foa_title TEXT,
    rating INTEGER,
    rapid_rating INTEGER,
    blitz_rating INTEGER,
    birth_year INTEGER,
    birthday INTEGER,
    flag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table storing historical ratings
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fide_id INTEGER NOT NULL,
    period TEXT NOT NULL,
    standard_rating INTEGER,
    rapid_rating INTEGER,
    blitz_rating INTEGER,
    games INTEGER,
    rapid_games INTEGER,
    blitz_games INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fide_id, period)
);

-- Top 100 snapshots table
CREATE TABLE IF NOT EXISTS top100_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    period TEXT NOT NULL,
    rank INTEGER NOT NULL,
    fide_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    federation TEXT,
    rating INTEGER NOT NULL,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, period, rank)
);

-- Rating lists metadata
CREATE TABLE IF NOT EXISTS rating_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT UNIQUE NOT NULL,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_url TEXT,
    file_size INTEGER,
    player_count INTEGER,
    status TEXT DEFAULT 'pending'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_fide_id ON players(fide_id);
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating DESC);
CREATE INDEX IF NOT EXISTS idx_players_rapid_rating ON players(rapid_rating DESC);
CREATE INDEX IF NOT EXISTS idx_players_blitz_rating ON players(blitz_rating DESC);
CREATE INDEX IF NOT EXISTS idx_players_federation ON players(federation);
CREATE INDEX IF NOT EXISTS idx_ratings_fide_id ON ratings(fide_id);
CREATE INDEX IF NOT EXISTS idx_ratings_period ON ratings(period);
CREATE INDEX IF NOT EXISTS idx_top100_category_period ON top100_snapshots(category, period);
CREATE INDEX IF NOT EXISTS idx_rating_lists_period ON rating_lists(period);