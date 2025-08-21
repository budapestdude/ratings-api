'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DatabaseStats {
  totalPlayers: number
  totalRatings: number
  dateRange: { earliest: string; latest: string }
  rapidRecords: number
  blitzRecords: number
}

export default function HomePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // For now, use hardcoded stats from our import
      setStats({
        totalPlayers: 582120,
        totalRatings: 26257050,
        dateRange: { earliest: '2015-01', latest: '2025-08' },
        rapidRecords: 15913237,
        blitzRecords: 10343813
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/players/{id}',
      description: 'Get player details by FIDE ID'
    },
    {
      method: 'GET',
      path: '/api/players/{id}/history',
      description: 'Get player rating history'
    },
    {
      method: 'GET',
      path: '/api/players/{id}/rating-changes',
      description: 'Get recent rating changes'
    },
    {
      method: 'GET',
      path: '/api/players/search',
      description: 'Search players by name'
    },
    {
      method: 'GET',
      path: '/api/rankings/top',
      description: 'Get top players by category'
    },
    {
      method: 'GET',
      path: '/api/rankings/statistics',
      description: 'Get rating distribution statistics'
    },
    {
      method: 'GET',
      path: '/api/rankings/federations',
      description: 'Get federation statistics'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">♔</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FIDE Rating API</h1>
                <p className="text-sm text-gray-600">Complete chess rating database (2015-2025)</p>
              </div>
            </div>
            <nav className="flex gap-6">
              <Link href="/api-docs" className="text-gray-600 hover:text-blue-600 font-medium">
                Documentation
              </Link>
              <Link href="/explorer" className="text-gray-600 hover:text-blue-600 font-medium">
                API Explorer
              </Link>
              <Link href="/top100-static" className="text-gray-600 hover:text-blue-600 font-medium">
                Rankings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                World Chess Rating Database
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Access comprehensive FIDE rating data for over half a million chess players. 
                Complete monthly ratings from 2015 to 2025 including standard, rapid, and blitz ratings.
              </p>
              <div className="flex gap-4">
                <Link 
                  href="/api-docs"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  View API Docs
                </Link>
                <Link 
                  href="/explorer"
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Try API Explorer
                </Link>
              </div>
            </div>
            
            {/* Stats Grid */}
            {!loading && stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <div className="text-3xl font-bold text-blue-900">
                    {stats.totalPlayers.toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">Total Players</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <div className="text-3xl font-bold text-green-900">
                    {stats.totalRatings.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Rating Records</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
                  <div className="text-3xl font-bold text-yellow-900">
                    {(stats.rapidRecords / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-yellow-700">Rapid Ratings</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <div className="text-3xl font-bold text-purple-900">
                    {(stats.blitzRecords / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-purple-700">Blitz Ratings</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Endpoints */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Endpoints</h3>
          <div className="space-y-3">
            {apiEndpoints.map((endpoint, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <span className={`px-3 py-1 rounded text-sm font-semibold ${
                  endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {endpoint.method}
                </span>
                <code className="flex-1 font-mono text-sm text-gray-800">{endpoint.path}</code>
                <span className="text-gray-600 text-sm">{endpoint.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Complete History</h4>
            <p className="text-gray-600">
              Monthly rating data from January 2015 to August 2025 for all active and inactive players.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Three Rating Types</h4>
            <p className="text-gray-600">
              Access standard, rapid, and blitz ratings with complete historical data for each format.
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Advanced Search</h4>
            <p className="text-gray-600">
              Filter by federation, title, rating range, age, and activity status.
            </p>
          </div>
        </div>

        {/* Quick Start */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-4">Quick Start</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold mb-2">Example: Get Magnus Carlsen's data</h4>
              <div className="bg-black/20 rounded-lg p-4">
                <code className="text-sm">
                  GET http://localhost:3001/api/players/1503014
                </code>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Example: Search for players</h4>
              <div className="bg-black/20 rounded-lg p-4">
                <code className="text-sm">
                  GET http://localhost:3001/api/players/search?name=carlsen
                </code>
              </div>
            </div>
          </div>
          <div className="mt-6 flex gap-4">
            <Link 
              href="/api-docs"
              className="px-6 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Full Documentation →
            </Link>
            <a 
              href="http://localhost:3001/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
            >
              Swagger UI →
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600">
          <p>
            Data sourced from FIDE (World Chess Federation) • Updated monthly
          </p>
          <p className="text-sm mt-2">
            Database contains {stats?.totalRatings.toLocaleString()} rating records across {stats?.totalPlayers.toLocaleString()} players
          </p>
        </div>
      </div>
    </div>
  )
}