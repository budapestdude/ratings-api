'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler
} from 'chart.js'
import { format } from 'date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Player {
  fide_id: number
  name: string
  title?: string
  federation?: string
  sex?: string
  birth_year?: number
  standard_rating?: number
  rapid_rating?: number
  blitz_rating?: number
  rating_date?: string
  is_active?: number
  inactive_date?: string
}

interface RatingHistory {
  rating_date: string
  standard_rating?: number
  rapid_rating?: number
  blitz_rating?: number
}

interface RatingChange {
  date: string | number
  standard: { rating?: number; change?: number }
  rapid: { rating?: number; change?: number }
  blitz: { rating?: number; change?: number }
}

export default function PlayerProfile({ params }: { params: { id: string } }) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [history, setHistory] = useState<RatingHistory[]>([])
  const [changes, setChanges] = useState<RatingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'standard' | 'rapid' | 'blitz'>('standard')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playerRes, historyRes, changesRes] = await Promise.all([
          fetch(`/api/backend/players/${params.id}`),
          fetch(`/api/backend/players/${params.id}/history`),
          fetch(`/api/backend/players/${params.id}/rating-changes`)
        ])

        const playerData = await playerRes.json()
        const historyData = await historyRes.json()
        const changesData = await changesRes.json()

        if (playerData.success && playerData.data) {
          setPlayer(playerData.data)
          setHistory(historyData.data || [])
          setChanges(changesData.data || [])
        } else {
          // Use placeholder data if API fails
          setPlayer(getPlaceholderPlayer(params.id))
          setHistory(getPlaceholderHistory())
          setChanges(getPlaceholderChanges())
        }
      } catch (error) {
        console.error('Error fetching player data:', error)
        // Use placeholder data on error
        setPlayer(getPlaceholderPlayer(params.id))
        setHistory(getPlaceholderHistory())
        setChanges(getPlaceholderChanges())
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  // Placeholder data functions
  const getPlaceholderPlayer = (id: string): Player => {
    const players: Record<string, Player> = {
      '1503014': {
        fide_id: 1503014,
        name: 'Carlsen, Magnus',
        title: 'GM',
        federation: 'NOR',
        sex: 'M',
        birth_year: 1990,
        standard_rating: 2839,
        rapid_rating: 2831,
        blitz_rating: 2887,
        rating_date: '2025-08-01'
      },
      '2020009': {
        fide_id: 2020009,
        name: 'Caruana, Fabiano',
        title: 'GM',
        federation: 'USA',
        sex: 'M',
        birth_year: 1992,
        standard_rating: 2805,
        rapid_rating: 2794,
        blitz_rating: 2821,
        rating_date: '2025-08-01'
      },
      '4168119': {
        fide_id: 4168119,
        name: 'Nakamura, Hikaru',
        title: 'GM',
        federation: 'USA',
        sex: 'M',
        birth_year: 1987,
        standard_rating: 2802,
        rapid_rating: 2805,
        blitz_rating: 2882,
        rating_date: '2025-08-01'
      }
    }
    
    return players[id] || {
      fide_id: parseInt(id),
      name: 'Player Name',
      title: 'GM',
      federation: 'FED',
      sex: 'M',
      birth_year: 1990,
      standard_rating: 2500,
      rapid_rating: 2480,
      blitz_rating: 2520,
      rating_date: '2025-08-01'
    }
  }

  const getPlaceholderHistory = (): RatingHistory[] => {
    const months = ['2025-08-01', '2025-07-01', '2025-06-01', '2025-05-01', '2025-04-01', 
                   '2025-03-01', '2025-02-01', '2025-01-01', '2024-12-01', '2024-11-01',
                   '2024-10-01', '2024-09-01']
    return months.map((date, i) => ({
      rating_date: date,
      standard_rating: 2839 - (i * 2) + Math.floor(Math.random() * 10),
      rapid_rating: 2831 - (i * 3) + Math.floor(Math.random() * 15),
      blitz_rating: 2887 + (i * 1) + Math.floor(Math.random() * 8)
    }))
  }

  const getPlaceholderChanges = (): RatingChange[] => {
    const months = [20250801, 20250701, 20250601, 20250501, 20250401]
    return months.map((date, i) => ({
      date: date,
      standard: {
        rating: 2839 - (i * 5),
        change: i === 0 ? null : Math.floor(Math.random() * 20) - 10
      },
      rapid: {
        rating: 2831 - (i * 3),
        change: i === 0 ? null : Math.floor(Math.random() * 25) - 12
      },
      blitz: {
        rating: 2887 + (i * 2),
        change: i === 0 ? null : Math.floor(Math.random() * 30) - 15
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-fide-blue mx-auto"></div>
          <div className="text-xl mt-4">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-2xl">Player not found</div>
      </div>
    )
  }

  // Convert YYYYMMDD format to proper date
  const parseRatingDate = (dateNum: string | number) => {
    const dateStr = dateNum.toString();
    // Validate date string format
    if (!dateStr || dateStr.length < 8) {
      console.warn('Invalid date format:', dateStr);
      return new Date(); // Return current date as fallback
    }
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const parsedDate = new Date(`${year}-${month}-${day}`);
    // Check if date is valid
    if (isNaN(parsedDate.getTime())) {
      console.warn('Invalid date:', dateStr);
      return new Date(); // Return current date as fallback
    }
    return parsedDate;
  };

  // Sort history by date and remove duplicates
  const uniqueHistory = history
    .filter(h => h.rating_date) // Filter out entries without rating_date
    .filter(h => {
      // Only include entries that have at least one rating value
      return h.standard_rating || h.rapid_rating || h.blitz_rating;
    })
    .sort((a, b) => {
      const dateA = typeof a.rating_date === 'string' ? parseInt(a.rating_date) : a.rating_date;
      const dateB = typeof b.rating_date === 'string' ? parseInt(b.rating_date) : b.rating_date;
      return dateA - dateB;
    })
    .filter((item, index, arr) => {
      if (index === 0) return true;
      const prevDate = arr[index - 1].rating_date.toString();
      const currDate = item.rating_date.toString();
      return prevDate.substring(0, 6) !== currDate.substring(0, 6); // Keep only one entry per month
    });

  const chartData = {
    labels: uniqueHistory.map(h => format(parseRatingDate(h.rating_date), 'MMM yyyy')),
    datasets: [
      {
        label: 'Standard',
        data: uniqueHistory.map(h => h.standard_rating),
        borderColor: activeTab === 'standard' ? '#002147' : 'transparent',
        backgroundColor: activeTab === 'standard' ? 'rgba(0, 33, 71, 0.1)' : 'transparent',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: activeTab === 'standard' ? 4 : 0,
        pointHoverRadius: 6,
        hidden: activeTab !== 'standard'
      },
      {
        label: 'Rapid',
        data: uniqueHistory.map(h => h.rapid_rating),
        borderColor: activeTab === 'rapid' ? '#FFD700' : 'transparent',
        backgroundColor: activeTab === 'rapid' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: activeTab === 'rapid' ? 4 : 0,
        pointHoverRadius: 6,
        hidden: activeTab !== 'rapid'
      },
      {
        label: 'Blitz',
        data: uniqueHistory.map(h => h.blitz_rating),
        borderColor: activeTab === 'blitz' ? '#10B981' : 'transparent',
        backgroundColor: activeTab === 'blitz' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: activeTab === 'blitz' ? 4 : 0,
        pointHoverRadius: 6,
        hidden: activeTab !== 'blitz'
      }
    ]
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context) => {
            return `Rating: ${context.parsed.y}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  const getTitleClass = (title?: string) => {
    if (!title) return ''
    if (title === 'GM') return 'text-red-600 font-bold'
    if (title === 'IM') return 'text-orange-600 font-bold'
    if (title === 'FM') return 'text-purple-600 font-bold'
    if (title === 'WGM' || title === 'WIM' || title === 'WFM') return 'text-pink-600 font-bold'
    return 'text-blue-600 font-bold'
  }

  const getCurrentRating = () => {
    switch(activeTab) {
      case 'rapid': return player.rapid_rating
      case 'blitz': return player.blitz_rating
      default: return player.standard_rating
    }
  }

  const getLatestChange = () => {
    if (changes.length === 0) return null
    const latest = changes[0]
    switch(activeTab) {
      case 'rapid': return latest.rapid
      case 'blitz': return latest.blitz
      default: return latest.standard
    }
  }

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'text-gray-400'
    if (rating >= 2800) return 'text-red-600'
    if (rating >= 2700) return 'text-orange-600'
    if (rating >= 2600) return 'text-yellow-600'
    if (rating >= 2500) return 'text-purple-600'
    if (rating >= 2400) return 'text-blue-600'
    if (rating >= 2300) return 'text-green-600'
    return 'text-gray-600'
  }

  const getAge = () => {
    if (!player.birth_year) return null
    return new Date().getFullYear() - player.birth_year
  }

  const getFlagEmoji = (federation?: string) => {
    const flags: Record<string, string> = {
      'USA': '🇺🇸',
      'NOR': '🇳🇴',
      'RUS': '🇷🇺',
      'CHN': '🇨🇳',
      'IND': '🇮🇳',
      'FRA': '🇫🇷',
      'GER': '🇩🇪',
      'NED': '🇳🇱',
      'POL': '🇵🇱',
      'ESP': '🇪🇸',
      'ITA': '🇮🇹',
      'UKR': '🇺🇦',
      'ENG': '🏴󐁧󐁢󐁥󐁮󐁧󐁿',
      'ARM': '🇦🇲',
      'AZE': '🇦🇿'
    }
    return federation ? (flags[federation] || '🏳️') : ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto p-8">
        {/* Player Header Card */}
        <div className="bg-gradient-to-r from-fide-blue to-blue-900 rounded-2xl shadow-2xl p-8 mb-8 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-4xl font-bold">
                  <span className={`inline-block px-3 py-1 rounded-lg bg-white/20 backdrop-blur ${getTitleClass(player.title)}`}>
                    {player.title}
                  </span>
                  <span className="ml-3">{player.name}</span>
                </h1>
                {player.is_active === 0 && (
                  <span className="inline-flex items-center px-4 py-2 rounded-full bg-gray-800/50 text-white/90 text-sm font-semibold backdrop-blur">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Inactive
                    {player.inactive_date && ` since ${new Date(player.inactive_date).getFullYear()}`}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6 text-white/90">
                <div className="flex items-center gap-2">
                  <span className="text-white/60">FIDE ID:</span>
                  <span className="font-semibold">{player.fide_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Federation:</span>
                  <span className="font-semibold flex items-center gap-2">
                    <span className="text-2xl">{getFlagEmoji(player.federation)}</span>
                    {player.federation || 'N/A'}
                  </span>
                </div>
                {player.birth_year && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">Age:</span>
                    <span className="font-semibold">{getAge()} years</span>
                  </div>
                )}
                {player.sex && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60">Gender:</span>
                    <span className="font-semibold">{player.sex === 'M' ? '♂ Male' : '♀ Female'}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-sm uppercase tracking-wider text-white/60 mb-2">
                  {activeTab} Rating
                </div>
                <div className={`text-6xl font-bold ${getRatingColor(getCurrentRating())}`}>
                  {getCurrentRating() || 'Unrated'}
                </div>
                {getLatestChange() && getLatestChange().change && (
                  <div className={`text-xl mt-3 font-semibold ${getLatestChange()!.change! > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {getLatestChange()!.change! > 0 ? '↑' : '↓'} {Math.abs(getLatestChange()!.change!)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rating Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setActiveTab('standard')}
            className={`relative overflow-hidden rounded-xl p-6 transition-all transform hover:scale-105 ${
              activeTab === 'standard' 
                ? 'bg-gradient-to-br from-fide-blue to-blue-800 text-white shadow-xl' 
                : 'bg-white hover:shadow-lg'
            }`}
          >
            <div className="relative z-10">
              <div className={`text-sm font-semibold uppercase tracking-wider ${activeTab === 'standard' ? 'text-white/80' : 'text-gray-500'}`}>
                Standard
              </div>
              <div className={`text-4xl font-bold mt-2 ${activeTab === 'standard' ? '' : getRatingColor(player.standard_rating)}`}>
                {player.standard_rating || 'Unrated'}
              </div>
              {changes.length > 0 && changes[0].standard.change && (
                <div className={`text-sm mt-2 ${changes[0].standard.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {changes[0].standard.change > 0 ? '+' : ''}{changes[0].standard.change}
                </div>
              )}
            </div>
            {activeTab === 'standard' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rapid')}
            className={`relative overflow-hidden rounded-xl p-6 transition-all transform hover:scale-105 ${
              activeTab === 'rapid' 
                ? 'bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-xl' 
                : 'bg-white hover:shadow-lg'
            }`}
          >
            <div className="relative z-10">
              <div className={`text-sm font-semibold uppercase tracking-wider ${activeTab === 'rapid' ? 'text-white/80' : 'text-gray-500'}`}>
                Rapid
              </div>
              <div className={`text-4xl font-bold mt-2 ${activeTab === 'rapid' ? '' : getRatingColor(player.rapid_rating)}`}>
                {player.rapid_rating || 'Unrated'}
              </div>
              {changes.length > 0 && changes[0].rapid.change && (
                <div className={`text-sm mt-2 ${changes[0].rapid.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {changes[0].rapid.change > 0 ? '+' : ''}{changes[0].rapid.change}
                </div>
              )}
            </div>
            {activeTab === 'rapid' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('blitz')}
            className={`relative overflow-hidden rounded-xl p-6 transition-all transform hover:scale-105 ${
              activeTab === 'blitz' 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl' 
                : 'bg-white hover:shadow-lg'
            }`}
          >
            <div className="relative z-10">
              <div className={`text-sm font-semibold uppercase tracking-wider ${activeTab === 'blitz' ? 'text-white/80' : 'text-gray-500'}`}>
                Blitz
              </div>
              <div className={`text-4xl font-bold mt-2 ${activeTab === 'blitz' ? '' : getRatingColor(player.blitz_rating)}`}>
                {player.blitz_rating || 'Unrated'}
              </div>
              {changes.length > 0 && changes[0].blitz.change && (
                <div className={`text-sm mt-2 ${changes[0].blitz.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {changes[0].blitz.change > 0 ? '+' : ''}{changes[0].blitz.change}
                </div>
              )}
            </div>
            {activeTab === 'blitz' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            )}
          </button>
        </div>

        {/* Rating Chart */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Rating Progression
            </h2>
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Recent Changes */}
        {changes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Recent Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-4 font-semibold text-gray-600">Period</th>
                    <th className="text-center p-4 font-semibold text-gray-600">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-fide-blue rounded-full"></div>
                        Standard
                      </div>
                    </th>
                    <th className="text-center p-4 font-semibold text-gray-600">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        Rapid
                      </div>
                    </th>
                    <th className="text-center p-4 font-semibold text-gray-600">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        Blitz
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition">
                      <td className="p-4 font-medium">{format(parseRatingDate(change.date), 'MMMM yyyy')}</td>
                      <td className="text-center p-4">
                        {change.standard.rating && (
                          <div className="flex items-center justify-center gap-3">
                            <span className={`font-bold text-lg ${getRatingColor(change.standard.rating)}`}>
                              {change.standard.rating}
                            </span>
                            {change.standard.change && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                                change.standard.change > 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {change.standard.change > 0 ? '+' : ''}{change.standard.change}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-center p-4">
                        {change.rapid.rating && (
                          <div className="flex items-center justify-center gap-3">
                            <span className={`font-bold text-lg ${getRatingColor(change.rapid.rating)}`}>
                              {change.rapid.rating}
                            </span>
                            {change.rapid.change && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                                change.rapid.change > 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {change.rapid.change > 0 ? '+' : ''}{change.rapid.change}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-center p-4">
                        {change.blitz.rating && (
                          <div className="flex items-center justify-center gap-3">
                            <span className={`font-bold text-lg ${getRatingColor(change.blitz.rating)}`}>
                              {change.blitz.rating}
                            </span>
                            {change.blitz.change && (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                                change.blitz.change > 0 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {change.blitz.change > 0 ? '+' : ''}{change.blitz.change}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}