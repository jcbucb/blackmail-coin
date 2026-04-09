'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-bold text-lg tracking-tight">
          Blackmail
        </Link>
        <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
          <Link href="/explore" className="hover:text-gray-900 transition-colors">
            Explore
          </Link>
          <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/create"
          className="hidden sm:block px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Create Pact
        </Link>
        <ConnectButton accountStatus="address" showBalance={false} />
      </div>
    </nav>
  )
}
