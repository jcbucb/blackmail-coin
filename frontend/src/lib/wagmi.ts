import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { base, baseSepolia } from 'viem/chains'

// Prefer the browser extension over Coinbase Smart Wallet
coinbaseWallet.preference = 'eoaOnly'

export const config = getDefaultConfig({
  appName: 'Blackmail',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default',
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [coinbaseWallet, metaMaskWallet, rainbowWallet, walletConnectWallet],
    },
  ],
  chains: [base, baseSepolia],
  ssr: true,
})
