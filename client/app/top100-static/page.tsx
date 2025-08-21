'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface RankedPlayer {
  rank: number
  fide_id: number
  name: string
  title?: string
  federation?: string
  rating: number
  birth_year?: number
  sex?: string
  games_played?: number
}

interface Top100Data {
  generatedAt: string
  month: string
  categories: {
    standard: CategoryData
    rapid: CategoryData
    blitz: CategoryData
  }
}

interface CategoryData {
  open: RankedPlayer[]
  women: RankedPlayer[]
  juniors: RankedPlayer[]
  girls: RankedPlayer[]
  seniors50: RankedPlayer[]
  seniors65: RankedPlayer[]
}

type Category = 'standard' | 'rapid' | 'blitz'
type ListType = 'open' | 'women' | 'juniors' | 'girls' | 'seniors50' | 'seniors65'

export default function StaticTop100Page() {
  const [category, setCategory] = useState<Category>('standard')
  const [listType, setListType] = useState<ListType>('open')
  const [data, setData] = useState<Top100Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStaticData()
  }, [])

  const fetchStaticData = async () => {
    try {
      const response = await fetch('/data/top100.json')
      if (!response.ok) {
        throw new Error('Failed to load top 100 data')
      }
      const jsonData = await response.json()
      setData(jsonData)
    } catch (err) {
      console.error('Error loading static data:', err)
      setError('Failed to load rankings data')
    } finally {
      setLoading(false)
    }
  }

  const getPlayers = (): RankedPlayer[] => {
    if (!data) return []
    return data.categories[category][listType] || []
  }

  const getTitleClass = (title?: string) => {
    if (!title) return ''
    if (title === 'GM') return 'text-red-600 font-bold'
    if (title === 'IM') return 'text-orange-600 font-bold'
    if (title === 'FM') return 'text-purple-600 font-bold'
    if (title === 'WGM' || title === 'WIM' || title === 'WFM') return 'text-pink-600 font-bold'
    return 'text-blue-600 font-bold'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 2800) return 'text-red-600'
    if (rating >= 2700) return 'text-orange-600'
    if (rating >= 2600) return 'text-yellow-600'
    if (rating >= 2500) return 'text-purple-600'
    if (rating >= 2400) return 'text-blue-600'
    if (rating >= 2300) return 'text-green-600'
    return 'text-gray-600'
  }

  const getFlagEmoji = (federation?: string) => {
    const flags: Record<string, string> = {
      'USA': '🇺🇸', 'NOR': '🇳🇴', 'RUS': '🇷🇺', 'CHN': '🇨🇳', 'IND': '🇮🇳',
      'FRA': '🇫🇷', 'GER': '🇩🇪', 'NED': '🇳🇱', 'POL': '🇵🇱', 'ESP': '🇪🇸',
      'ITA': '🇮🇹', 'UKR': '🇺🇦', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'ARM': '🇦🇲', 'AZE': '🇦🇿',
      'HUN': '🇭🇺', 'ISR': '🇮🇱', 'CUB': '🇨🇺', 'ARG': '🇦🇷', 'BRA': '🇧🇷'
    }
    return federation ? (flags[federation] || '🏳️') : ''
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  const getAge = (birthYear?: number) => {
    if (!birthYear) return null
    const age = new Date().getFullYear() - birthYear
    // Handle the incorrect birth year data
    if (age > 100 || age < 0) return null
    return age
  }

  const getCategoryColor = (cat: Category) => {
    switch(cat) {
      case 'standard': return 'from-fide-blue to-blue-800'
      case 'rapid': return 'from-yellow-500 to-orange-600'
      case 'blitz': return 'from-green-500 to-emerald-600'
    }
  }

  const getListTitle = () => {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1)
    switch(listType) {
      case 'women': return `Top 100 Women - ${categoryName}`
      case 'juniors': return `Top 100 Juniors (U20) - ${categoryName}`
      case 'girls': return `Top 100 Girls (U20) - ${categoryName}`
      case 'seniors50': return `Top 100 Seniors (50+) - ${categoryName}`
      case 'seniors65': return `Top 100 Seniors (65+) - ${categoryName}`
      default: return `Top 100 Open - ${categoryName}`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const players = getPlayers()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getCategoryColor(category)} rounded-2xl shadow-2xl p-8 mb-8 text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-4">{getListTitle()}</h1>
              <p className="text-xl opacity-90">World Chess Federation Official Rankings</p>
              {data && (
                <>
                  <p className="text-sm opacity-75 mt-2">Month: {data.month}</p>
                  <p className="text-xs opacity-60 mt-1">Generated: {formatDate(data.generatedAt)}</p>
                </>
              )}
            </div>
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur">
              <div className="text-2xl font-bold">📊</div>
              <div className="text-xs mt-1">Static Data</div>
              <div className="text-xs opacity-75">Updates Monthly</div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Category Selector */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating Category</label>
                <div className="flex gap-2">
                  {(['standard', 'rapid', 'blitz'] as Category[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        category === cat
                          ? cat === 'standard' ? 'bg-fide-blue text-white' 
                            : cat === 'rapid' ? 'bg-yellow-500 text-white'
                            : 'bg-green-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">List Type</label>
                <div className="flex gap-2 flex-wrap">
                  {(['open', 'women', 'juniors', 'girls', 'seniors50', 'seniors65'] as ListType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setListType(type)}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        listType === type
                          ? 'bg-fide-blue text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'open' ? 'Open' 
                        : type === 'women' ? 'Women'
                        : type === 'juniors' ? 'Juniors'
                        : type === 'girls' ? 'Girls'
                        : type === 'seniors50' ? 'Seniors 50+'
                        : 'Seniors 65+'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Bar */}
        {!loading && !error && players.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-sm text-gray-600">Highest Rating</div>
              <div className={`text-2xl font-bold ${getRatingColor(players[0]?.rating || 0)}`}>
                {players[0]?.rating || '-'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-sm text-gray-600">Average Rating</div>
              <div className="text-2xl font-bold text-gray-800">
                {players.length > 0 ? Math.round(players.reduce((acc, p) => acc + p.rating, 0) / players.length) : '-'}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-sm text-gray-600">Countries</div>
              <div className="text-2xl font-bold text-gray-800">
                {new Set(players.map(p => p.federation)).size}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-sm text-gray-600">Titled Players</div>
              <div className="text-2xl font-bold text-gray-800">
                {players.filter(p => p.title).length}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-fide-blue mx-auto"></div>
              <div className="text-xl mt-4">Loading static rankings...</div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && players.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-gray-600">
              No players found for {listType} in {category} category.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {category === 'rapid' || category === 'blitz' 
                ? `${category.charAt(0).toUpperCase() + category.slice(1)} ratings have not been imported yet. Only standard ratings are currently available.`
                : 'This may be because the data hasn\'t been fully imported yet.'}
            </p>
          </div>
        )}

        {/* Players Table */}
        {!loading && !error && players.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full">
              <thead className={`bg-gradient-to-r ${getCategoryColor(category)} text-white`}>
                <tr>
                  <th className="text-center p-4 w-20">Rank</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-center p-4 w-24">Fed</th>
                  <th className="text-center p-4 w-24">Rating</th>
                  <th className="text-center p-4 w-20">Age</th>
                  <th className="text-center p-4 w-20">Games</th>
                  <th className="text-center p-4 w-24">Profile</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, idx) => (
                  <tr 
                    key={player.fide_id} 
                    className={`
                      border-b hover:bg-gray-50 transition
                      ${idx === 0 ? 'bg-yellow-50' : ''}
                      ${idx === 1 ? 'bg-gray-50' : ''}
                      ${idx === 2 ? 'bg-orange-50' : ''}
                    `}
                  >
                    <td className="text-center p-4 font-bold text-2xl">
                      {getRankDisplay(player.rank)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-lg">
                            <span className={getTitleClass(player.title)}>{player.title} </span>
                            {player.name}
                          </div>
                          {player.sex === 'F' && (
                            <span className="text-pink-600 text-sm">♀</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">{getFlagEmoji(player.federation)}</span>
                        <span className="font-medium">{player.federation}</span>
                      </div>
                    </td>
                    <td className="text-center p-4">
                      <span className={`text-2xl font-bold ${getRatingColor(player.rating)}`}>
                        {player.rating}
                      </span>
                    </td>
                    <td className="text-center p-4 text-gray-600">
                      {getAge(player.birth_year) || '-'}
                    </td>
                    <td className="text-center p-4 text-gray-600">
                      {player.games_played || '-'}
                    </td>
                    <td className="text-center p-4">
                      <Link 
                        href={`/profile/${player.fide_id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-fide-blue text-white rounded-lg hover:bg-blue-800 transition"
                      >
                        View
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Export Options */}
        {!loading && !error && players.length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            <button 
              onClick={() => {
                const csv = [
                  ['Rank', 'Name', 'Title', 'Federation', 'Rating', 'Birth Year', 'Games'],
                  ...players.map(p => [
                    p.rank, 
                    p.name, 
                    p.title || '', 
                    p.federation || '', 
                    p.rating, 
                    p.birth_year || '',
                    p.games_played || ''
                  ])
                ].map(row => row.join(',')).join('\n')
                
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `top100_${category}_${listType}_${new Date().toISOString().split('T')[0]}.csv`
                a.click()
              }}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition"
            >
              📊 Export as CSV
            </button>
            <button 
              onClick={() => window.print()}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition"
            >
              🖨️ Print List
            </button>
          </div>
        )}

        {/* Update Notice */}
        {data && (
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>This data is automatically updated on the 1st of each month.</p>
            <p>Last update: {data.month}</p>
          </div>
        )}
      </div>
    </div>
  )
}