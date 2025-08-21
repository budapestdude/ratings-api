-- Players table storing basic player information
CREATE TABLE IF NOT EXISTS players (
    fide_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT,
    federation TEXT,
    sex TEXT,
    birth_year INTEGER,
    flag TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table storing historical ratings
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fide_id INTEGER NOT NULL,
    rating_date DATE NOT NULL,
    standard_rating INTEGER,
    standard_games INTEGER,
    rapid_rating INTEGER,
    rapid_games INTEGER,
    blitz_rating INTEGER,
    blitz_games INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fide_id) REFERENCES players(fide_id),
    UNIQUE(fide_id, rating_date)
);

-- Rating lists metadata
CREATE TABLE IF NOT EXISTS rating_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_date DATE NOT NULL UNIQUE,
    file_name TEXT,
    import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_players INTEGER,
    status TEXT DEFAULT 'pending'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_federation ON players(federation);
CREATE INDEX IF NOT EXISTS idx_ratings_fide_id ON ratings(fide_id);
CREATE INDEX IF NOT EXISTS idx_ratings_date ON ratings(rating_date);
CREATE INDEX IF NOT EXISTS idx_ratings_standard ON ratings(standard_rating);
CREATE INDEX IF NOT EXISTS idx_ratings_rapid ON ratings(rapid_rating);
CREATE INDEX IF NOT EXISTS idx_ratings_blitz ON ratings(blitz_rating);