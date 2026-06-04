import type { ProfilePlanetDemoData } from '../types/profilePlanet'

export const demoProfilePlanet: ProfilePlanetDemoData = {
  title: 'Profile Planet Demo',
  subtitle: 'An isolated experiment for a profile-shaped planet experience.',
  stats: [
    { label: 'Memories', value: '128' },
    { label: 'Folders', value: '12' },
    { label: 'Communities', value: '5' },
  ],
  controls: [
    { label: 'Planet mood', value: 'Quiet orbit' },
    { label: 'Surface density', value: 'Medium' },
    { label: 'Map preview', value: 'Pinned memories' },
  ],
}
