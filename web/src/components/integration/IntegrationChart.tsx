/**
 * IntegrationChart - 統合機能の統計情報チャート
 * .mdcルール準拠: データ可視化、レスポンシブ、アクセシブル
 */

import React from 'react'
import { 
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'

interface IntegrationData {
  totalSessions: number
  totalMessages: number
  cursorSessions: number
  cursorMessages: number
  regularSessions: number
  regularMessages: number
}

interface IntegrationChartProps {
  data: IntegrationData
  className?: string
}

const IntegrationChart: React.FC<IntegrationChartProps> = ({
  data,
  className = ''
}) => {
  // パーセンテージ計算
  const cursorSessionPercentage = data.totalSessions > 0 
    ? (data.cursorSessions / data.totalSessions) * 100 
    : 0
  
  const cursorMessagePercentage = data.totalMessages > 0 
    ? (data.cursorMessages / data.totalMessages) * 100 
    : 0

  const chartData = [
    {
      label: 'Cursorセッション',
      value: data.cursorSessions,
      total: data.totalSessions,
      percentage: cursorSessionPercentage,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      icon: ComputerDesktopIcon
    },
    {
      label: '通常セッション',
      value: data.regularSessions,
      total: data.totalSessions,
      percentage: 100 - cursorSessionPercentage,
      color: 'bg-gray-500',
      lightColor: 'bg-gray-100',
      icon: DocumentTextIcon
    }
  ]

  const messageData = [
    {
      label: 'Cursorメッセージ',
      value: data.cursorMessages,
      total: data.totalMessages,
      percentage: cursorMessagePercentage,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      icon: ComputerDesktopIcon
    },
    {
      label: '通常メッセージ',
      value: data.regularMessages,
      total: data.totalMessages,
      percentage: 100 - cursorMessagePercentage,
      color: 'bg-gray-500',
      lightColor: 'bg-gray-100',
      icon: ChatBubbleLeftRightIcon
    }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* セッション分布 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">セッション分布</h3>
        </div>
        
        <div className="space-y-4">
          {chartData.map((item, index) => {
            const IconComponent = item.icon
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.value.toLocaleString()} ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            総セッション数: {data.totalSessions.toLocaleString()}
          </div>
        </div>
      </div>

      {/* メッセージ分布 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">メッセージ分布</h3>
        </div>
        
        <div className="space-y-4">
          {messageData.map((item, index) => {
            const IconComponent = item.icon
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.value.toLocaleString()} ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            総メッセージ数: {data.totalMessages.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">統計サマリー</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {cursorSessionPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-700">Cursor統合率</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {data.cursorSessions > 0 ? (data.cursorMessages / data.cursorSessions).toFixed(1) : '0'}
            </div>
            <div className="text-sm text-green-700">平均メッセージ/セッション</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntegrationChart 