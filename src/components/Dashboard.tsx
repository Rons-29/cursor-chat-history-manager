import React, { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Monitor } from '../utils/Monitor.js'
import { AlertNotifier } from '../utils/AlertNotifier.js'
import type { Report, ReportPeriod, Metric } from '../types/monitoring.js'

interface DashboardProps {
  monitor: {
    getMetrics: () => Metric[]
    generateReport: (period?: ReportPeriod) => Report
  }
  refreshInterval: number
}

interface MetricData {
  name: string
  value: number
  timestamp: Date
  labels: Record<string, string>
}

interface ChartData {
  timestamp: string
  [key: string]: string | number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export const Dashboard: React.FC<DashboardProps> = ({
  monitor,
  refreshInterval = 5000,
}) => {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [alerts, setAlerts] = useState<Array<{
    metric: string
    message: string
    severity: string
    timestamp: Date
  }>>([])
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report>({ metrics: {} })
  const [period, setPeriod] = useState<ReportPeriod>({
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: new Date()
  })

  useEffect(() => {
    const updateData = () => {
      setMetrics(monitor.getMetrics())
      setReport(monitor.generateReport(period))
    }

    updateData()
    const interval = setInterval(updateData, refreshInterval)
    return () => clearInterval(interval)
  }, [monitor, refreshInterval, period])

  useEffect(() => {
    const handleAlert = (alert: {
      metric: string
      message: string
      severity: string
      timestamp: Date
    }) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10))
    }

    monitor.on('alert', handleAlert)

    return () => {
      monitor.off('alert', handleAlert)
    }
  }, [monitor])

  const formatChartData = (metricName: string): ChartData[] => {
    return metrics.map(m => ({
      timestamp: m.timestamp.toLocaleTimeString(),
      [m.name]: m.value,
      ...m.labels,
    }))
  }

  const renderMetricCard = (metric: Metric) => {
    return (
      <div key={metric.name} className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">{metric.name}</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500">現在値</div>
            <div className="text-xl font-bold">{metric.value}</div>
          </div>
        </div>
        {renderLineChart(metric.name)}
      </div>
    )
  }

  const renderLineChart = (metricName: string) => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formatChartData(metricName)}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey={metricName}
          stroke={COLORS[0]}
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )

  const renderBarChart = (metricName: string) => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatChartData(metricName)}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={metricName} fill={COLORS[1]} />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderPieChart = (metricName: string) => {
    const data = metrics.reduce((acc, curr) => {
      const value = Math.round(curr.value)
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const pieData = Object.entries(data ?? {}).map(([name, value]) => ({
      name,
      value,
    }))

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {pieData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const renderAlertCard = (alert: {
    metric: string
    message: string
    severity: string
    timestamp: Date
  }) => {
    const severityColors = {
      error: 'bg-red-100 text-red-800 border-red-400',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-400',
      info: 'bg-blue-100 text-blue-800 border-blue-400',
    }

    const severityIcons = {
      error: '⚠️',
      warning: '⚠️',
      info: 'ℹ️',
    }

    return (
      <div
        key={alert.timestamp.getTime()}
        className={`p-4 rounded-lg border ${severityColors[alert.severity as keyof typeof severityColors]}`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            {severityIcons[alert.severity as keyof typeof severityIcons]}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{alert.metric}</div>
              <div className="text-sm">
                {alert.timestamp.toLocaleString()}
              </div>
            </div>
            <div className="mt-1">{alert.message}</div>
          </div>
        </div>
      </div>
    )
  }

  const handlePeriodChange = (newPeriod: ReportPeriod) => {
    setPeriod(newPeriod)
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h2 className="font-bold">エラーが発生しました</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-4">モニタリングダッシュボード</h1>
        <div className="flex space-x-2 mb-4">
          <button
            className={`px-4 py-2 rounded ${
              period.startTime.getTime() === new Date(Date.now() - 60 * 60 * 1000).getTime()
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => handlePeriodChange({
              startTime: new Date(Date.now() - 60 * 60 * 1000),
              endTime: new Date()
            })}
          >
            1時間
          </button>
          <button
            className={`px-4 py-2 rounded ${
              period.startTime.getTime() === new Date(Date.now() - 24 * 60 * 60 * 1000).getTime()
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => handlePeriodChange({
              startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
              endTime: new Date()
            })}
          >
            24時間
          </button>
          <button
            className={`px-4 py-2 rounded ${
              period.startTime.getTime() === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => handlePeriodChange({
              startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              endTime: new Date()
            })}
          >
            7日間
          </button>
          <button
            className={`px-4 py-2 rounded ${
              period.startTime.getTime() === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
            onClick={() => handlePeriodChange({
              startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              endTime: new Date()
            })}
          >
            30日間
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">レポート</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(report.metrics).map(([metricName, data]) => (
            <div key={metricName} className="bg-white p-4 rounded shadow">
              <h3 className="font-medium mb-2">{metricName}</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>現在値:</span>
                  <span>{data.current.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>平均値:</span>
                  <span>{data.average.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>最大値:</span>
                  <span>{data.max.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>最小値:</span>
                  <span>{data.min.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {metrics.map(renderMetricCard)}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">アラート</h2>
          <div className="text-sm text-gray-500">
            {alerts.length}件のアラート
          </div>
        </div>
        <div className="space-y-4">
          {alerts.length > 0 ? (
            alerts.map(renderAlertCard)
          ) : (
            <div className="text-center text-gray-500 py-4">
              アラートはありません
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(report.metrics).map(metricName => (
          <div key={metricName} className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">{metricName} - 分布</h2>
            {renderPieChart(metricName)}
          </div>
        ))}
      </div>
    </div>
  )
} 