import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FIDE Ratings',
  description: 'FIDE Chess Ratings Database',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-fide-blue text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              FIDE Ratings
            </Link>
            <div className="space-x-6">
              <Link href="/" className="hover:text-fide-gold">Home</Link>
              <Link href="/search" className="hover:text-fide-gold">Search</Link>
              <Link href="/rankings" className="hover:text-fide-gold">Rankings</Link>
              <Link href="/top100" className="hover:text-fide-gold font-bold">Top 100</Link>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  )
}