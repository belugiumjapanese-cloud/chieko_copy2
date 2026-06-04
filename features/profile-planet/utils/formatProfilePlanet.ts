import type { ProfilePlanetStat } from '../types/profilePlanet'

export function formatProfilePlanetStats(stats: ProfilePlanetStat[]) {
  return stats.map((stat) => `${stat.value} ${stat.label}`).join(' / ')
}
