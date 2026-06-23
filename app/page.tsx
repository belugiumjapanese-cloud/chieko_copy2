import { redirect } from 'next/navigation'

export default function Home() {
  // Keep the public root on the restored UI Lab experience.
  redirect('/ui-lab')
}
