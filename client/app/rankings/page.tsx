'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface RankedPlayer {
  rank: number
  fide_id: number
  name: string
  title?: string
  federation?: string
  rating: number
  birth_year?: number
}

export default function RankingsPage() {
  const searchParams = useSearchParams()
  const category = searchParams.get('category') || 'standard'
  const [players, setPlayers] = useState<RankedPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    federation: '',
    title: '',
    sex: ''
  })

  useEffect(() => {
    fetchRankings()
  }, [category, filters])

  const fetchRankings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        category,
        limit: '100'
      })
      
      if (filters.federation) params.append('federation', filters.federation)
      if (filters.title) params.append('title', filters.title)
      if (filters.sex) params.append('sex', filters.sex)

      const res = await fetch(`/api/backend/rankings/top?${params}`)
      const data = await res.json()
      setPlayers(data.data || [])
    } catch (error) {
      console.error('Error fetching rankings:', error)
      setPlayers([])
    } finally {
      setLoading(false)
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

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank.toString()
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Top {category.charAt(0).toUpperCase() + category.slice(1)} Rankings</h1>
      
      {/* Category Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <Link
          href="/rankings?category=standard"
          className={`pb-2 px-4 ${category === 'standard' ? 'border-b-2 border-fide-blue text-fide-blue font-bold' : 'text-gray-600'}`}
        >
          Standard
        </Link>
        <Link
          href="/rankings?category=rapid"
          className={`pb-2 px-4 ${category === 'rapid' ? 'border-b-2 border-fide-blue text-fide-blue font-bold' : 'text-gray-600'}`}
        >
          Rapid
        </Link>
        <Link
          href="/rankings?category=blitz"
          className={`pb-2 px-4 ${category === 'blitz' ? 'border-b-2 border-fide-blue text-fide-blue font-bold' : 'text-gray-600'}`}
        >
          Blitz
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Federation</label>
            <input
              type="text"
              value={filters.federation}
              onChange={(e) => setFilters({...filters, federation: e.target.value.toUpperCase()})}
              placeholder="e.g., USA, NOR"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-fide-blue"
              maxLength={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <select
              value={filters.title}
              onChange={(e) => setFilters({...filters, title: e.target.value})}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-fide-blue"
            >
              <option value="">All</option>
              <option value="GM">GM</option>
              <option value="IM">IM</option>
              <option value="FM">FM</option>
              <option value="WGM">WGM</option>
              <option value="WIM">WIM</option>
              <option value="WFM">WFM</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <select
              value={filters.sex}
              onChange={(e) => setFilters({...filters, sex: e.target.value})}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-fide-blue"
            >
              <option value="">All</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ federation: '', title: '', sex: '' })}
              className="w-full bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="text-xl">Loading rankings...</div>
        </div>
      )}

      {!loading && players.length === 0 && (
        <div className="text-center py-8">
          <div className="text-xl text-gray-600">No players found with these filters</div>
        </div>
      )}

      {!loading && players.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-fide-blue text-white">
              <tr>
                <th className="text-center p-4">Rank</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Federation</th>
                <th className="text-center p-4">Rating</th>
                <th className="text-center p-4">Birth Year</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.fide_id} className="border-b hover:bg-gray-50">
                  <td className="text-center p-4 font-bold text-lg">
                    {getRankBadge(player.rank)}
                  </td>
                  <td className="p-4">
                    <Link href={`/profile/${player.fide_id}`} className="hover:text-fide-blue">
                      <span className={getTitleClass(player.title)}>{player.title} </span>
                      {player.name}
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center">
                      {player.federation || '-'}
                    </span>
                  </td>
                  <td className="text-center p-4 font-bold text-lg">
                    {player.rating}
                  </td>
                  <td className="text-center p-4">
                    {player.birth_year || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}