'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('players')

  const sections = {
    players: {
      title: 'Players API',
      endpoints: [
        {
          method: 'GET',
          path: '/api/players/{id}',
          description: 'Get player details by FIDE ID',
          params: [
            { name: 'id', type: 'path', required: true, description: 'FIDE ID of the player' }
          ],
          example: {
            request: 'GET /api/players/1503014',
            response: `{
  "success": true,
  "data": {
    "fide_id": 1503014,
    "name": "Carlsen, Magnus",
    "title": "GM",
    "federation": "NOR",
    "standard_rating": 2839,
    "rapid_rating": 2809,
    "blitz_rating": 2881,
    "birth_year": 1990,
    "sex": "M"
  }
}`
          }
        },
        {
          method: 'GET',
          path: '/api/players/{id}/history',
          description: 'Get complete rating history for a player',
          params: [
            { name: 'id', type: 'path', required: true, description: 'FIDE ID of the player' },
            { name: 'limit', type: 'query', required: false, description: 'Number of months to return' }
          ],
          example: {
            request: 'GET /api/players/1503014/history?limit=12',
            response: `{
  "success": true,
  "data": [
    {
      "rating_date": 20250801,
      "standard_rating": 2839,
      "rapid_rating": 2809,
      "blitz_rating": 2881
    },
    ...
  ]
}`
          }
        },
        {
          method: 'GET',
          path: '/api/players/search',
          description: 'Search for players by name',
          params: [
            { name: 'name', type: 'query', required: true, description: 'Player name (partial match)' },
            { name: 'limit', type: 'query', required: false, description: 'Max results (default: 100)' },
            { name: 'federation', type: 'query', required: false, description: 'Filter by federation code' },
            { name: 'title', type: 'query', required: false, description: 'Filter by title (GM, IM, FM, etc.)' }
          ],
          example: {
            request: 'GET /api/players/search?name=carlsen&limit=5',
            response: `{
  "success": true,
  "data": [
    {
      "fide_id": 1503014,
      "name": "Carlsen, Magnus",
      "title": "GM",
      "federation": "NOR",
      "standard_rating": 2839
    }
  ]
}`
          }
        }
      ]
    },
    rankings: {
      title: 'Rankings API',
      endpoints: [
        {
          method: 'GET',
          path: '/api/rankings/top',
          description: 'Get top players by category and filters',
          params: [
            { name: 'category', type: 'query', required: false, description: 'Rating type: standard, rapid, blitz (default: standard)' },
            { name: 'limit', type: 'query', required: false, description: 'Number of players (default: 100)' },
            { name: 'sex', type: 'query', required: false, description: 'Filter by sex: M or F' },
            { name: 'minAge', type: 'query', required: false, description: 'Minimum age filter' },
            { name: 'maxAge', type: 'query', required: false, description: 'Maximum age filter' },
            { name: 'federation', type: 'query', required: false, description: 'Filter by federation' },
            { name: 'title', type: 'query', required: false, description: 'Filter by title' },
            { name: 'excludeInactive', type: 'query', required: false, description: 'Exclude inactive players (default: true)' }
          ],
          example: {
            request: 'GET /api/rankings/top?category=rapid&limit=10&sex=F',
            response: `{
  "success": true,
  "data": [
    {
      "rank": 1,
      "fide_id": 8602980,
      "name": "Hou, Yifan",
      "title": "GM",
      "federation": "CHN",
      "rating": 2536
    },
    ...
  ]
}`
          }
        },
        {
          method: 'GET',
          path: '/api/rankings/statistics',
          description: 'Get rating distribution statistics',
          params: [],
          example: {
            request: 'GET /api/rankings/statistics',
            response: `{
  "success": true,
  "data": {
    "summary": {
      "total_players": 582120,
      "titled_players": 45231,
      "avg_standard": 1892.5,
      "max_standard": 2839
    },
    "distribution": [
      {"rating_range": "2800+", "count": 5},
      {"rating_range": "2600-2799", "count": 412},
      ...
    ]
  }
}`
          }
        }
      ]
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">♔</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">FIDE Rating API</h1>
                  <p className="text-sm text-gray-600">API Documentation</p>
                </div>
              </Link>
            </div>
            <nav className="flex gap-6">
              <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">
                Home
              </Link>
              <Link href="/explorer" className="text-gray-600 hover:text-blue-600 font-medium">
                API Explorer
              </Link>
              <a 
                href="http://localhost:3001/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 font-medium"
              >
                Swagger UI
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="font-bold text-gray-900 mb-4">API Sections</h3>
              <nav className="space-y-2">
                {Object.entries(sections).map(([key, section]) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      activeSection === key
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {sections[activeSection as keyof typeof sections].title}
              </h2>
              
              <div className="space-y-12">
                {sections[activeSection as keyof typeof sections].endpoints.map((endpoint, idx) => (
                  <div key={idx} className="border-b pb-8 last:border-b-0">
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${
                        endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-lg font-mono text-gray-800">{endpoint.path}</code>
                    </div>
                    
                    <p className="text-gray-600 mb-6">{endpoint.description}</p>
                    
                    {/* Parameters */}
                    {endpoint.params.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">Parameters</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-sm text-gray-600">
                                <th className="pb-2">Name</th>
                                <th className="pb-2">Type</th>
                                <th className="pb-2">Required</th>
                                <th className="pb-2">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {endpoint.params.map((param, pidx) => (
                                <tr key={pidx} className="border-t">
                                  <td className="py-2">
                                    <code className="text-sm bg-gray-200 px-2 py-1 rounded">
                                      {param.name}
                                    </code>
                                  </td>
                                  <td className="py-2 text-sm text-gray-600">{param.type}</td>
                                  <td className="py-2">
                                    {param.required ? (
                                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                        required
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                        optional
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 text-sm text-gray-600">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* Example */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Example</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-600 mb-2">Request</h5>
                          <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
                            <code className="text-sm whitespace-pre">
                              {endpoint.example.request}
                            </code>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-600 mb-2">Response</h5>
                          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                            <code className="text-sm whitespace-pre">
                              {endpoint.example.response}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rate Limits */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Rate Limits</h3>
              <p className="text-blue-800">
                The API currently has no rate limits, but please be respectful and avoid excessive requests.
                For bulk data needs, consider using the database export functionality.
              </p>
            </div>

            {/* Base URL */}
            <div className="bg-gray-100 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Base URL</h3>
              <code className="text-lg bg-white px-4 py-2 rounded">
                http://localhost:3001
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}