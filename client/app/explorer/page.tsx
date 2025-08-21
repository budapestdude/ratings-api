'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  pagination?: {
    limit: number
    offset: number
  }
}

export default function ApiExplorerPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState('players')
  const [params, setParams] = useState<Record<string, string>>({})
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | null>(null)

  const endpoints = {
    players: {
      title: 'Get Player by ID',
      method: 'GET',
      path: '/api/players/{id}',
      params: [
        { name: 'id', type: 'path', required: true, description: 'FIDE ID', example: '1503014' }
      ]
    },
    history: {
      title: 'Get Player History',
      method: 'GET',
      path: '/api/players/{id}/history',
      params: [
        { name: 'id', type: 'path', required: true, description: 'FIDE ID', example: '1503014' },
        { name: 'limit', type: 'query', required: false, description: 'Number of records', example: '12' }
      ]
    },
    changes: {
      title: 'Get Rating Changes',
      method: 'GET',
      path: '/api/players/{id}/rating-changes',
      params: [
        { name: 'id', type: 'path', required: true, description: 'FIDE ID', example: '1503014' }
      ]
    },
    search: {
      title: 'Search Players',
      method: 'GET',
      path: '/api/players/search',
      params: [
        { name: 'name', type: 'query', required: false, description: 'Player name', example: 'Carlsen' },
        { name: 'federation', type: 'query', required: false, description: 'Federation code', example: 'USA' },
        { name: 'title', type: 'query', required: false, description: 'Title (GM, IM, etc)', example: 'GM' },
        { name: 'minRating', type: 'query', required: false, description: 'Minimum rating', example: '2600' },
        { name: 'maxRating', type: 'query', required: false, description: 'Maximum rating', example: '2800' },
        { name: 'limit', type: 'query', required: false, description: 'Max results', example: '10' }
      ]
    },
    rankings: {
      title: 'Get Top Rankings',
      method: 'GET',
      path: '/api/rankings/top',
      params: [
        { name: 'category', type: 'query', required: false, description: 'Rating type', example: 'standard' },
        { name: 'limit', type: 'query', required: false, description: 'Number of players', example: '10' },
        { name: 'sex', type: 'query', required: false, description: 'Gender (M/F)', example: 'F' },
        { name: 'minAge', type: 'query', required: false, description: 'Minimum age', example: '50' },
        { name: 'maxAge', type: 'query', required: false, description: 'Maximum age', example: '20' },
        { name: 'federation', type: 'query', required: false, description: 'Federation', example: 'USA' },
        { name: 'excludeInactive', type: 'query', required: false, description: 'Exclude inactive', example: 'true' }
      ]
    },
    statistics: {
      title: 'Get Statistics',
      method: 'GET',
      path: '/api/rankings/statistics',
      params: []
    },
    federations: {
      title: 'Get Federation Stats',
      method: 'GET',
      path: '/api/rankings/federations',
      params: []
    }
  }

  const buildUrl = () => {
    const endpoint = endpoints[selectedEndpoint as keyof typeof endpoints]
    let url = endpoint.path

    // Replace path parameters
    endpoint.params.forEach(param => {
      if (param.type === 'path' && params[param.name]) {
        url = url.replace(`{${param.name}}`, params[param.name])
      }
    })

    // Add query parameters
    const queryParams = endpoint.params
      .filter(p => p.type === 'query' && params[p.name])
      .map(p => `${p.name}=${encodeURIComponent(params[p.name])}`)
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&')
    }

    return url
  }

  const executeRequest = async () => {
    const endpoint = endpoints[selectedEndpoint as keyof typeof endpoints]
    
    // Check if required params are filled
    const missingRequired = endpoint.params
      .filter(p => p.required && !params[p.name])
      .map(p => p.name)
    
    if (missingRequired.length > 0) {
      alert(`Missing required parameters: ${missingRequired.join(', ')}`)
      return
    }

    setLoading(true)
    setResponse(null)
    
    const startTime = performance.now()
    
    try {
      const url = buildUrl()
      const res = await fetch(`/api/backend${url}`)
      const data = await res.json()
      
      setExecutionTime(performance.now() - startTime)
      setResponse(data)
    } catch (error) {
      setExecutionTime(performance.now() - startTime)
      setResponse({
        success: false,
        error: 'Failed to execute request: ' + (error as Error).message
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const currentEndpoint = endpoints[selectedEndpoint as keyof typeof endpoints]

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
                  <p className="text-sm text-gray-600">Interactive API Explorer</p>
                </div>
              </Link>
            </div>
            <nav className="flex gap-6">
              <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium">
                Home
              </Link>
              <Link href="/api-docs" className="text-gray-600 hover:text-blue-600 font-medium">
                Documentation
              </Link>
              <Link href="/top100-static" className="text-gray-600 hover:text-blue-600 font-medium">
                Rankings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar - Endpoint Selection */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h3 className="font-bold text-gray-900 mb-4">Select Endpoint</h3>
              <nav className="space-y-2">
                {Object.entries(endpoints).map(([key, endpoint]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedEndpoint(key)
                      setParams({})
                      setResponse(null)
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      selectedEndpoint === key
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{endpoint.title}</div>
                    <div className={`text-xs mt-1 ${
                      selectedEndpoint === key ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {endpoint.method} {endpoint.path}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-8">
            {/* Request Builder */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentEndpoint.title}</h2>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-semibold text-sm">
                    {currentEndpoint.method}
                  </span>
                  <code className="text-gray-700 font-mono">{currentEndpoint.path}</code>
                </div>
              </div>

              {/* Parameters */}
              {currentEndpoint.params.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Parameters</h3>
                  <div className="space-y-4">
                    {currentEndpoint.params.map(param => (
                      <div key={param.name} className="flex items-start gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {param.name}
                            {param.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type="text"
                            value={params[param.name] || ''}
                            onChange={(e) => setParams({...params, [param.name]: e.target.value})}
                            placeholder={param.example}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                        </div>
                        <div className="pt-7">
                          <span className={`text-xs px-2 py-1 rounded ${
                            param.type === 'path' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {param.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated URL */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Request URL</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-4 py-2 rounded-lg font-mono text-sm">
                    http://localhost:3001{buildUrl()}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`http://localhost:3001${buildUrl()}`)}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                    title="Copy URL"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* Execute Button */}
              <button
                onClick={executeRequest}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  loading 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Executing...' : 'Execute Request'}
              </button>
            </div>

            {/* Response */}
            {response && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Response</h3>
                  <div className="flex items-center gap-4">
                    {executionTime && (
                      <span className="text-sm text-gray-600">
                        ⏱️ {executionTime.toFixed(0)}ms
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${
                      response.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {response.success ? '✓ Success' : '✗ Error'}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                    <code className="text-sm">
                      {JSON.stringify(response, null, 2)}
                    </code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                    className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition"
                  >
                    Copy
                  </button>
                </div>

                {/* Quick Stats */}
                {response.success && response.data && (
                  <div className="mt-4 flex gap-4 text-sm text-gray-600">
                    {Array.isArray(response.data) && (
                      <span>📊 {response.data.length} results</span>
                    )}
                    {response.pagination && (
                      <>
                        <span>📄 Limit: {response.pagination.limit}</span>
                        <span>📍 Offset: {response.pagination.offset}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Example Queries */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-4">Try These Examples</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSelectedEndpoint('players')
                    setParams({ id: '1503014' })
                  }}
                  className="text-left p-3 bg-white rounded-lg hover:shadow-md transition"
                >
                  <div className="font-medium text-gray-900">Magnus Carlsen Profile</div>
                  <div className="text-sm text-gray-600">Get details for FIDE ID 1503014</div>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedEndpoint('search')
                    setParams({ name: 'Nakamura', limit: '5' })
                  }}
                  className="text-left p-3 bg-white rounded-lg hover:shadow-md transition"
                >
                  <div className="font-medium text-gray-900">Search for Nakamura</div>
                  <div className="text-sm text-gray-600">Find players named Nakamura</div>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedEndpoint('rankings')
                    setParams({ category: 'blitz', limit: '10' })
                  }}
                  className="text-left p-3 bg-white rounded-lg hover:shadow-md transition"
                >
                  <div className="font-medium text-gray-900">Top 10 Blitz Players</div>
                  <div className="text-sm text-gray-600">Get highest rated blitz players</div>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedEndpoint('rankings')
                    setParams({ sex: 'F', category: 'standard', limit: '10' })
                  }}
                  className="text-left p-3 bg-white rounded-lg hover:shadow-md transition"
                >
                  <div className="font-medium text-gray-900">Top Women Players</div>
                  <div className="text-sm text-gray-600">Top 10 female players by standard rating</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}