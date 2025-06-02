import type { ChatHistoryStats } from './index.js'
import type { CursorLogStats } from './cursor.js'
import type { IntegrationStats } from './integration.js'

export interface DashboardProps {
  chatHistoryStats: ChatHistoryStats
  cursorLogStats: CursorLogStats
  integrationStats: IntegrationStats
  onRefresh: () => void
  onExport: () => void
  onSettings: () => void
}

export interface DashboardState {
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  selectedTab: 'overview' | 'chat' | 'cursor' | 'integration'
  timeRange: {
    start: Date
    end: Date
  }
  filters: {
    project?: string
    tags?: string[]
    types?: string[]
  }
}

export interface DashboardChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor: string
    borderColor: string
    borderWidth: number
  }>
}

export interface DashboardTableData {
  headers: string[]
  rows: Array<{
    id: string
    cells: Array<{
      value: string | number | Date
      type: 'text' | 'number' | 'date' | 'tag'
    }>
  }>
}
