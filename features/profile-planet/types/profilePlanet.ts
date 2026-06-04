export type ProfilePlanetStat = {
  label: string
  value: string
}

export type ProfilePlanetControl = {
  label: string
  value: string
}

export type ProfilePlanetPanel = {
  id: string
  label: string
  description: string
}

export type ProfilePlanetDemoData = {
  title: string
  subtitle: string
  stats: ProfilePlanetStat[]
  controls: ProfilePlanetControl[]
}
