import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'

const inter = Inter({ subsets: ['latin'] })

// Load all wallet/wagmi providers client-side only to avoid WalletConnect
// trying to access localStorage during SSR static generation.
const ClientLayout = dynamic(() => import('./client-layout'), { ssr: false })

export const metadata: Metadata = {
  title: 'Blackmail',
  description: 'Stake USDC on any Strava goal. Hit your target or lose your money.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
