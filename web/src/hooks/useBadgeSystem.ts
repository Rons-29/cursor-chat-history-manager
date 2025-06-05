import { useState, useCallback, useEffect } from 'react'

interface BadgeData {
  readonly id: string
  readonly type: 'achievement' | 'milestone' | 'streak' | 'discovery' | 'level'
  readonly title: string
  readonly description?: string
  readonly icon?: string
  readonly earned?: boolean
  readonly progress?: number
  readonly maxProgress?: number
  readonly rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  readonly earnedDate?: Date
  readonly category?: string
  readonly condition: (stats: UserStats) => boolean
  readonly progressCalculator?: (stats: UserStats) => number
}

interface UserStats {
  readonly totalSessions: number
  readonly totalMessages: number
  readonly consecutiveDays: number
  readonly searchCount: number
  readonly exportCount: number
  readonly uniqueProjects: number
  readonly averageSessionLength: number
  readonly lastActiveDate: Date
}

interface BadgeNotification {
  readonly show: boolean
  readonly badge: BadgeData | null
  readonly celebrationLevel: 'minimal' | 'normal' | 'epic'
}

/**
 * バッジシステム管理フック
 * 
 * @example
 * ```tsx
 * const { 
 *   badges, 
 *   notification, 
 *   updateUserStats, 
 *   dismissNotification 
 * } = useBadgeSystem()
 * 
 * // 統計更新時にバッジ判定
 * useEffect(() => {
 *   updateUserStats({
 *     totalSessions: 150,
 *     totalMessages: 1000,
 *     // ... その他の統計
 *   })
 * }, [sessionData])
 * ```
 */
export const useBadgeSystem = () => {
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [userStats, setUserStats] = useState<UserStats>({
    totalSessions: 0,
    totalMessages: 0,
    consecutiveDays: 0,
    searchCount: 0,
    exportCount: 0,
    uniqueProjects: 0,
    averageSessionLength: 0,
    lastActiveDate: new Date()
  })
  const [notification, setNotification] = useState<BadgeNotification>({
    show: false,
    badge: null,
    celebrationLevel: 'normal'
  })
  
  // バッジ定義（実際のアプリケーションではAPIから取得）
  const badgeDefinitions: BadgeData[] = [
    // アチーブメント系
    {
      id: 'first-session',
      type: 'achievement',
      title: '初回セッション',
      description: '最初のAI対話を開始',
      icon: '🌟',
      rarity: 'common',
      condition: (stats) => stats.totalSessions >= 1,
      earned: false,
      maxProgress: 1
    },
    {
      id: 'session-explorer',
      type: 'achievement',
      title: 'セッション探検家',
      description: '10回のAI対話を完了',
      icon: '🧭',
      rarity: 'common',
      condition: (stats) => stats.totalSessions >= 10,
      progressCalculator: (stats) => Math.min(stats.totalSessions, 10),
      earned: false,
      maxProgress: 10
    },
    {
      id: 'session-master',
      type: 'achievement',
      title: 'セッションマスター',
      description: '100回のAI対話を達成',
      icon: '🏆',
      rarity: 'epic',
      condition: (stats) => stats.totalSessions >= 100,
      progressCalculator: (stats) => Math.min(stats.totalSessions, 100),
      earned: false,
      maxProgress: 100
    },
    {
      id: 'conversation-legend',
      type: 'achievement',
      title: '対話の伝説',
      description: '1000メッセージを送信',
      icon: '💬',
      rarity: 'legendary',
      condition: (stats) => stats.totalMessages >= 1000,
      progressCalculator: (stats) => Math.min(stats.totalMessages, 1000),
      earned: false,
      maxProgress: 1000
    },
    
    // ストリーク系
    {
      id: 'daily-user',
      type: 'streak',
      title: 'デイリーユーザー',
      description: '7日連続でアクセス',
      icon: '🔥',
      rarity: 'rare',
      condition: (stats) => stats.consecutiveDays >= 7,
      progressCalculator: (stats) => Math.min(stats.consecutiveDays, 7),
      earned: false,
      maxProgress: 7
    },
    {
      id: 'unstoppable',
      type: 'streak',
      title: '止まらない情熱',
      description: '30日連続でアクセス',
      icon: '🚀',
      rarity: 'epic',
      condition: (stats) => stats.consecutiveDays >= 30,
      progressCalculator: (stats) => Math.min(stats.consecutiveDays, 30),
      earned: false,
      maxProgress: 30
    },
    
    // 発見系
    {
      id: 'search-expert',
      type: 'discovery',
      title: '検索エキスパート',
      description: '100回の検索を実行',
      icon: '🔍',
      rarity: 'rare',
      condition: (stats) => stats.searchCount >= 100,
      progressCalculator: (stats) => Math.min(stats.searchCount, 100),
      earned: false,
      maxProgress: 100
    },
    {
      id: 'data-export-master',
      type: 'discovery',
      title: 'データエクスポートマスター',
      description: '50回のエクスポートを実行',
      icon: '📊',
      rarity: 'rare',
      condition: (stats) => stats.exportCount >= 50,
      progressCalculator: (stats) => Math.min(stats.exportCount, 50),
      earned: false,
      maxProgress: 50
    },
    
    // マイルストーン系
    {
      id: 'project-diversifier',
      type: 'milestone',
      title: 'プロジェクト多様化',
      description: '5つ以上のプロジェクトで作業',
      icon: '🎯',
      rarity: 'rare',
      condition: (stats) => stats.uniqueProjects >= 5,
      progressCalculator: (stats) => Math.min(stats.uniqueProjects, 5),
      earned: false,
      maxProgress: 5
    },
    {
      id: 'deep-thinker',
      type: 'milestone',
      title: '深い思考者',
      description: '平均セッション時間30分以上',
      icon: '🧠',
      rarity: 'epic',
      condition: (stats) => stats.averageSessionLength >= 30,
      progressCalculator: (stats) => Math.min(stats.averageSessionLength, 30),
      earned: false,
      maxProgress: 30
    }
  ]
  
  // バッジ初期化
  useEffect(() => {
    setBadges(badgeDefinitions)
  }, [])
  
  // ユーザー統計更新とバッジ判定
  const updateUserStats = useCallback((newStats: Partial<UserStats>) => {
    setUserStats(prevStats => {
      const updatedStats = { ...prevStats, ...newStats }
      
      // バッジ獲得判定
      setBadges(prevBadges => 
        prevBadges.map(badge => {
          if (badge.earned) return badge
          
          const isEarned = badge.condition(updatedStats)
          const progress = badge.progressCalculator ? badge.progressCalculator(updatedStats) : 0
          
          // 新規獲得時の通知
          if (isEarned && !badge.earned) {
            const celebrationLevel = 
              badge.rarity === 'legendary' ? 'epic' :
              badge.rarity === 'epic' ? 'epic' :
              badge.rarity === 'rare' ? 'normal' : 'minimal'
            
            setNotification({
              show: true,
              badge: { ...badge, earned: true, earnedDate: new Date() },
              celebrationLevel
            })
          }
          
          return {
            ...badge,
            earned: isEarned,
            progress,
            earnedDate: isEarned && !badge.earned ? new Date() : badge.earnedDate
          }
        })
      )
      
      return updatedStats
    })
  }, [])
  
  // 通知を閉じる
  const dismissNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }))
  }, [])
  
  // バッジ統計計算
  const badgeStats = {
    total: badges.length,
    earned: badges.filter(b => b.earned).length,
    inProgress: badges.filter(b => !b.earned && (b.progress || 0) > 0).length,
    byRarity: {
      common: badges.filter(b => b.earned && b.rarity === 'common').length,
      rare: badges.filter(b => b.earned && b.rarity === 'rare').length,
      epic: badges.filter(b => b.earned && b.rarity === 'epic').length,
      legendary: badges.filter(b => b.earned && b.rarity === 'legendary').length
    },
    byType: {
      achievement: badges.filter(b => b.earned && b.type === 'achievement').length,
      milestone: badges.filter(b => b.earned && b.type === 'milestone').length,
      streak: badges.filter(b => b.earned && b.type === 'streak').length,
      discovery: badges.filter(b => b.earned && b.type === 'discovery').length,
      level: badges.filter(b => b.earned && b.type === 'level').length
    }
  }
  
  // 次に獲得可能なバッジ
  const nextBadges = badges
    .filter(b => !b.earned && (b.progress || 0) > 0)
    .sort((a, b) => {
      const aProgress = ((a.progress || 0) / (a.maxProgress || 1)) * 100
      const bProgress = ((b.progress || 0) / (b.maxProgress || 1)) * 100
      return bProgress - aProgress
    })
    .slice(0, 3)
  
  return {
    badges,
    userStats,
    notification,
    badgeStats,
    nextBadges,
    updateUserStats,
    dismissNotification
  }
}

export default useBadgeSystem 