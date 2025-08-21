'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Player {
  fide_id: number
  name: string
  title?: string
  federation?: string
  standard_rating?: number
  rapid_rating?: number
  blitz_rating?: number
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState(query)

  useEffect(() => {
    if (query) {
      searchPlayers(query)
    }
  }, [query])

  const searchPlayers = async (searchQuery: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/backend/players/search?name=${encodeURIComponent(searchQuery)}&limit=100`)
      const data = await res.json()
      setPlayers(data.data || [])
    } catch (error) {
      console.error('Search error:', error)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchInput)}`
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

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Search Players</h1>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex max-w-2xl">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by player name..."
            className="flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:border-fide-blue"
          />
          <button
            type="submit"
            className="bg-fide-blue hover:bg-blue-900 text-white font-bold px-6 py-2 rounded-r-lg transition"
          >
            Search
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center py-8">
          <div className="text-xl">Searching...</div>
        </div>
      )}

      {!loading && query && players.length === 0 && (
        <div className="text-center py-8">
          <div className="text-xl text-gray-600">No players found for "{query}"</div>
        </div>
      )}

      {!loading && players.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-fide-blue text-white">
              <tr>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Federation</th>
                <th className="text-center p-4">Standard</th>
                <th className="text-center p-4">Rapid</th>
                <th className="text-center p-4">Blitz</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.fide_id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <Link href={`/profile/${player.fide_id}`} className="hover:text-fide-blue">
                      <span className={getTitleClass(player.title)}>{player.title} </span>
                      {player.name}
                    </Link>
                  </td>
                  <td className="p-4">{player.federation || '-'}</td>
                  <td className="text-center p-4 font-medium">
                    {player.standard_rating || '-'}
                  </td>
                  <td className="text-center p-4 font-medium">
                    {player.rapid_rating || '-'}
                  </td>
                  <td className="text-center p-4 font-medium">
                    {player.blitz_rating || '-'}
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