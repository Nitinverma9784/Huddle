import { notFound } from 'next/navigation'
import { getSessionAnalytics } from './actions'
import { AnalyticsView } from './analytics-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { id } = await params

  let data
  try {
    data = await getSessionAnalytics(id)
  } catch {
    notFound()
  }

  return <AnalyticsView data={data} />
}
