/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // MetaMask SDK and WalletConnect pull in React Native / Node-only deps
    // that don't exist in a browser bundle. Stub them out.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
      encoding: false,
    }
    return config
  },
}

export default nextConfig
