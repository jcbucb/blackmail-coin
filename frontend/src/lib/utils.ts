import { GoalType, GOAL_TYPES, PactStatus, metersToKm } from './contract'

export function formatGoalValue(value: bigint, goalType: GoalType): string {
  const option = GOAL_TYPES.find((g) => g.value === goalType)
  if (!option) return value.toString()

  if (option.isDistance) {
    return `${metersToKm(value).toFixed(1)} km`
  }
  return `${value.toString()} ${option.unit}`
}

export function formatDeadline(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCountdown(deadline: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = deadline - now

  if (diff <= 0) return 'Deadline passed'

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

export function getPactStatusLabel(status: PactStatus): string {
  switch (status) {
    case PactStatus.Active:
      return 'Active'
    case PactStatus.Resolved:
      return 'Resolved'
    case PactStatus.Expired:
      return 'Expired (Refunded)'
    default:
      return 'Unknown'
  }
}

export function getPactStatusColor(status: PactStatus): string {
  switch (status) {
    case PactStatus.Active:
      return 'text-blue-600 bg-blue-50'
    case PactStatus.Resolved:
      return 'text-green-600 bg-green-50'
    case PactStatus.Expired:
      return 'text-gray-600 bg-gray-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function isGracePeriodOver(deadline: number): boolean {
  const SEVEN_DAYS = 7 * 24 * 60 * 60
  return Math.floor(Date.now() / 1000) >= deadline + SEVEN_DAYS
}
