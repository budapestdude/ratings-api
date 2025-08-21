export interface Player {
    fide_id: number;
    name: string;
    title?: string;
    federation?: string;
    sex?: string;
    birth_year?: number;
    flag?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface Rating {
    id?: number;
    fide_id: number;
    rating_date: string;
    standard_rating?: number;
    standard_games?: number;
    rapid_rating?: number;
    rapid_games?: number;
    blitz_rating?: number;
    blitz_games?: number;
    created_at?: Date;
}

export interface RatingList {
    id?: number;
    list_date: string;
    file_name?: string;
    import_date?: Date;
    total_players?: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface PlayerWithRating extends Player {
    standard_rating?: number;
    rapid_rating?: number;
    blitz_rating?: number;
    rating_date?: string;
}