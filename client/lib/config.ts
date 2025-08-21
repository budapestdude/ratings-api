// API configuration for different environments

const getApiUrl = () => {
  // In production, use relative URLs since frontend and backend are served from same domain
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // In development, use localhost
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
  players: {
    get: (id: string) => `${API_URL}/api/players/${id}`,
    search: () => `${API_URL}/api/players/search`,
    history: (id: string) => `${API_URL}/api/players/${id}/history`,
    ratingChanges: (id: string) => `${API_URL}/api/players/${id}/rating-changes`
  },
  rankings: {
    top: () => `${API_URL}/api/rankings/top`,
    statistics: () => `${API_URL}/api/rankings/statistics`,
    federations: () => `${API_URL}/api/rankings/federations`
  }
};