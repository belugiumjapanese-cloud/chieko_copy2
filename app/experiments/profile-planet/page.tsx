import type { Metadata } from 'next'
import { ProfilePlanetDemo } from '../../../features/profile-planet/components/ProfilePlanetDemo'

export const metadata: Metadata = {
  title: 'Profile Planet Demo',
  description: 'An isolated experimental route for the Profile Planet feature.',
}

export default function ProfilePlanetExperimentPage() {
  return <ProfilePlanetDemo />
}
