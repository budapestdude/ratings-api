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
}

type Category = 'standard' | 'rapid' | 'blitz'
type ListType = 'open' | 'women' | 'juniors' | 'girls' | 'seniors'

export default function Top2600Page() {
  const [category, setCategory] = useState<Category>('standard')
  const [listType, setListType] = useState<ListType>('open')
  const [players, setPlayers] = useState<RankedPlayer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTop100()
  }, [category, listType])

  const fetchTop100 = async () => {
    setLoading(true)
    try {
      // For now, load from the static JSON file for standard category
      if (category === 'standard' && listType === 'open') {
        const res = await fetch('/data/top_2600_standard.json')
        const data = await res.json()

        if (data && data.players) {
          // Map the data to match the expected format
          const mappedPlayers = data.players.map((p: any) => ({
            rank: p.rank,
            fide_id: p.fide_id,
            name: p.name,
            title: p.title,
            federation: p.federation,
            rating: p.standard_rating || p.rating,
            birth_year: p.birth_year,
            sex: 'M' // Assuming men's list for now
          }))
          setPlayers(mappedPlayers)
        } else {
          setPlayers(getPlaceholderPlayers())
        }
      } else {
        // For other categories/types, try the API endpoint
        const params = new URLSearchParams({
          category,
          limit: '100'
        })

        // Add filters based on list type
        switch(listType) {
          case 'women':
            params.append('sex', 'F')
            break
          case 'juniors':
            params.append('maxAge', '20')
            break
          case 'girls':
            params.append('sex', 'F')
            params.append('maxAge', '20')
            break
          case 'seniors':
            params.append('minAge', '50')
            break
        }

        const res = await fetch(`/api/backend/rankings/top?${params}`)
        const data = await res.json()

        if (data.success && data.data) {
          setPlayers(data.data)
        } else {
          // Use placeholder data if API fails
          setPlayers(getPlaceholderPlayers())
        }
      }
    } catch (error) {
      console.error('Error fetching top 100:', error)
      setPlayers(getPlaceholderPlayers())
    } finally {
      setLoading(false)
    }
  }

  const getPlaceholderPlayers = (): RankedPlayer[] => {
    const topPlayers = [
      { name: 'Carlsen, Magnus', title: 'GM', federation: 'NOR', rating: 2839, birth_year: 1990 },
      { name: 'Caruana, Fabiano', title: 'GM', federation: 'USA', rating: 2805, birth_year: 1992 },
      { name: 'Nakamura, Hikaru', title: 'GM', federation: 'USA', rating: 2802, birth_year: 1987 },
      { name: 'Nepomniachtchi, Ian', title: 'GM', federation: 'RUS', rating: 2795, birth_year: 1990 },
      { name: 'Aronian, Levon', title: 'GM', federation: 'USA', rating: 2790, birth_year: 1982 },
      { name: 'Giri, Anish', title: 'GM', federation: 'NED', rating: 2788, birth_year: 1994 },
      { name: 'So, Wesley', title: 'GM', federation: 'USA', rating: 2785, birth_year: 1993 },
      { name: 'Vachier-Lagrave, Maxime', title: 'GM', federation: 'FRA', rating: 2784, birth_year: 1990 },
      { name: 'Dominguez Perez, Leinier', title: 'GM', federation: 'USA', rating: 2782, birth_year: 1983 },
      { name: 'Rapport, Richard', title: 'GM', federation: 'HUN', rating: 2780, birth_year: 1996 },
    ]

    return Array.from({ length: 100 }, (_, i) => {
      if (i < topPlayers.length) {
        return {
          rank: i + 1,
          fide_id: 1000000 + i,
          ...topPlayers[i],
          sex: 'M'
        }
      }
      return {
        rank: i + 1,
        fide_id: 1000000 + i,
        name: `Player ${i + 1}`,
        title: i < 30 ? 'GM' : i < 60 ? 'IM' : 'FM',
        federation: ['USA', 'RUS', 'CHN', 'IND', 'GER', 'FRA'][i % 6],
        rating: 2780 - (i * 5),
        birth_year: 1980 + (i % 30),
        sex: listType === 'women' || listType === 'girls' ? 'F' : 'M'
      }
    })
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
    return new Date().getFullYear() - birthYear
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
      case 'women': return `Women 2600+ - ${categoryName}`
      case 'juniors': return `Juniors 2600+ (U20) - ${categoryName}`
      case 'girls': return `Girls 2600+ (U20) - ${categoryName}`
      case 'seniors': return `Seniors 2600+ (50+) - ${categoryName}`
      default: return `Top 2600+ Players - ${categoryName}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getCategoryColor(category)} rounded-2xl shadow-2xl p-8 mb-8 text-white`}>
          <h1 className="text-4xl font-bold mb-4">Top 2600+ Players - {category.charAt(0).toUpperCase() + category.slice(1)}</h1>
          <p className="text-xl opacity-90">World Chess Federation Official Rankings</p>
          <p className="text-sm opacity-75 mt-2">Last updated: August 2025</p>
        </div>

        {/* Category Selector */}
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
                {(['open', 'women', 'juniors', 'girls', 'seniors'] as ListType[]).map(type => (
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
                      : 'Seniors'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Bar */}
        {!loading && players.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-sm text-gray-600">Highest Rating</div>
              <div className={`text-2xl font-bold ${getRatingColor(players[0]?.rating || 0)}`}>
                {players[0]?.rating}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-sm text-gray-600">Average Rating</div>
              <div className="text-2xl font-bold text-gray-800">
                {Math.round(players.reduce((acc, p) => acc + p.rating, 0) / players.length)}
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
              <div className="text-xl mt-4">Loading top 2600+ players...</div>
            </div>
          </div>
        )}

        {/* No Data State for Rapid/Blitz */}
        {!loading && players.length === 0 && (category === 'rapid' || category === 'blitz') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">{category.charAt(0).toUpperCase() + category.slice(1)} Ratings Not Available</h3>
            <p className="text-gray-600">
              {category.charAt(0).toUpperCase() + category.slice(1)} ratings have not been imported into the database yet.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Only standard ratings are currently available. To view {category} ratings, the corresponding FIDE {category} rating files need to be imported.
            </p>
          </div>
        )}

        {/* Players Table */}
        {!loading && players.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full">
              <thead className={`bg-gradient-to-r ${getCategoryColor(category)} text-white`}>
                <tr>
                  <th className="text-center p-4 w-20">Rank</th>
                  <th className="text-left p-4">Name</th>
                  <th className="text-center p-4 w-24">Fed</th>
                  <th className="text-center p-4 w-24">Rating</th>
                  <th className="text-center p-4 w-20">Age</th>
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
        <div className="mt-8 flex justify-center gap-4">
          <button 
            onClick={() => {
              const csv = [
                ['Rank', 'Name', 'Title', 'Federation', 'Rating', 'Birth Year'],
                ...players.map(p => [p.rank, p.name, p.title || '', p.federation || '', p.rating, p.birth_year || ''])
              ].map(row => row.join(',')).join('\n')
              
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `top_2600_${category}_${listType}_${new Date().toISOString().split('T')[0]}.csv`
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
      </div>
    </div>
  )
}