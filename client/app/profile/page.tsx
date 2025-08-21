'use client'

import { useSearchParams } from 'next/navigation'
import PlayerProfile from '../profile-old/page'

export default function ProfilePage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">No Player ID Provided</h1>
          <p>Please provide a player ID in the URL: /profile?id=1503014</p>
        </div>
      </div>
    )
  }

  return <PlayerProfile params={{ id }} />
}