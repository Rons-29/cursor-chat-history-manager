import { ChatHistoryService } from './ChatHistoryService.js';
import { ChatSession, ChatMessage } from '../types/index.js';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

export interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  averageSessionLength: number; // メッセージ数
  averageSessionDuration: number; // 分
  mostActiveHour: number;
  mostActiveDay: string;
  userMessageCount: number;
  assistantMessageCount: number;
  systemMessageCount: number;
}

export interface PeriodActivity {
  date: string;
  sessionCount: number;
  messageCount: number;
  userMessages: number;
  assistantMessages: number;
  averageSessionLength: number;
}

export interface ActivityReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  activities: PeriodActivity[];
  summary: UsageStats;
  trends: {
    sessionTrend: 'increasing' | 'decreasing' | 'stable';
    messageTrend: 'increasing' | 'decreasing' | 'stable';
    engagementTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface KeywordAnalysis {
  keyword: string;
  frequency: number;
  sessions: string[];
  firstUsed: Date;
  lastUsed: Date;
}

export class AnalyticsService {
  constructor(private chatHistoryService: ChatHistoryService) {}

  /**
   * 全体的な使用統計を取得
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<UsageStats> {
    const filter = {
      startDate,
      endDate,
      limit: 10000 // 大きな値を設定して全データを取得
    };

    const searchResult = await this.chatHistoryService.searchSessions(filter);
    const sessions = searchResult.sessions;

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        averageSessionLength: 0,
        averageSessionDuration: 0,
        mostActiveHour: 0,
        mostActiveDay: 'Monday',
        userMessageCount: 0,
        assistantMessageCount: 0,
        systemMessageCount: 0
      };
    }

    // 基本統計
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const averageSessionLength = totalMessages / totalSessions;

    // セッション継続時間の計算
    const sessionDurations = sessions
      .filter(session => session.endTime)
      .map(session => {
        const duration = session.endTime!.getTime() - session.startTime.getTime();
        return duration / (1000 * 60); // 分に変換
      });
    
    const averageSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0;

    // 時間別活動分析
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Map<string, number>();

    // メッセージタイプ別カウント
    let userMessageCount = 0;
    let assistantMessageCount = 0;
    let systemMessageCount = 0;

    sessions.forEach(session => {
      session.messages.forEach(message => {
        // 時間別活動
        const hour = message.timestamp.getHours();
        hourlyActivity[hour]++;

        // 曜日別活動
        const dayName = format(message.timestamp, 'EEEE');
        dailyActivity.set(dayName, (dailyActivity.get(dayName) || 0) + 1);

        // メッセージタイプ別カウント
        switch (message.role) {
          case 'user':
            userMessageCount++;
            break;
          case 'assistant':
            assistantMessageCount++;
            break;
          case 'system':
            systemMessageCount++;
            break;
        }
      });
    });

    // 最も活発な時間と曜日を特定
    const mostActiveHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const mostActiveDay = Array.from(dailyActivity.entries())
      .reduce((max, [day, count]) => count > max.count ? { day, count } : max, { day: 'Monday', count: 0 })
      .day;

    return {
      totalSessions,
      totalMessages,
      averageSessionLength,
      averageSessionDuration,
      mostActiveHour,
      mostActiveDay,
      userMessageCount,
      assistantMessageCount,
      systemMessageCount
    };
  }

  /**
   * 期間別活動レポートを生成
   */
  async generateActivityReport(
    startDate: Date,
    endDate: Date,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ActivityReport> {
    const sessions = await this.getSessionsInPeriod(startDate, endDate);
    
    let intervals: Date[];
    let formatString: string;

    switch (period) {
      case 'daily':
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
        formatString = 'yyyy-MM-dd';
        break;
      case 'weekly':
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
        formatString = 'yyyy-MM-dd';
        break;
      case 'monthly':
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        formatString = 'yyyy-MM';
        break;
    }

    const activities: PeriodActivity[] = intervals.map(intervalStart => {
      let intervalEnd: Date;
      
      switch (period) {
        case 'daily':
          intervalEnd = endOfDay(intervalStart);
          break;
        case 'weekly':
          intervalEnd = endOfWeek(intervalStart);
          break;
        case 'monthly':
          intervalEnd = endOfMonth(intervalStart);
          break;
      }

      const periodSessions = sessions.filter(session => 
        session.startTime >= intervalStart && session.startTime <= intervalEnd
      );

      const messageCount = periodSessions.reduce((sum, session) => sum + session.messages.length, 0);
      const userMessages = periodSessions.reduce((sum, session) => 
        sum + session.messages.filter(msg => msg.role === 'user').length, 0
      );
      const assistantMessages = periodSessions.reduce((sum, session) => 
        sum + session.messages.filter(msg => msg.role === 'assistant').length, 0
      );

      return {
        date: format(intervalStart, formatString),
        sessionCount: periodSessions.length,
        messageCount,
        userMessages,
        assistantMessages,
        averageSessionLength: periodSessions.length > 0 ? messageCount / periodSessions.length : 0
      };
    });

    // 全体統計
    const summary = await this.getUsageStats(startDate, endDate);

    // トレンド分析
    const trends = this.analyzeTrends(activities);

    return {
      period,
      startDate,
      endDate,
      activities,
      summary,
      trends
    };
  }

  /**
   * キーワード分析を実行
   */
  async analyzeKeywords(
    startDate?: Date,
    endDate?: Date,
    minFrequency: number = 2
  ): Promise<KeywordAnalysis[]> {
    const sessions = await this.getSessionsInPeriod(startDate, endDate);
    const keywordMap = new Map<string, {
      frequency: number;
      sessions: Set<string>;
      firstUsed: Date;
      lastUsed: Date;
    }>();

    sessions.forEach(session => {
      session.messages.forEach(message => {
        if (message.role === 'user') {
          // 簡単なキーワード抽出（実際の実装ではより高度な自然言語処理を使用可能）
          const words = message.content
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2); // 3文字以上の単語のみ

          words.forEach(word => {
            const existing = keywordMap.get(word);
            if (existing) {
              existing.frequency++;
              existing.sessions.add(session.id);
              if (message.timestamp < existing.firstUsed) {
                existing.firstUsed = message.timestamp;
              }
              if (message.timestamp > existing.lastUsed) {
                existing.lastUsed = message.timestamp;
              }
            } else {
              keywordMap.set(word, {
                frequency: 1,
                sessions: new Set([session.id]),
                firstUsed: message.timestamp,
                lastUsed: message.timestamp
              });
            }
          });
        }
      });
    });

    // 結果を配列に変換し、頻度でソート
    return Array.from(keywordMap.entries())
      .filter(([_, data]) => data.frequency >= minFrequency)
      .map(([keyword, data]) => ({
        keyword,
        frequency: data.frequency,
        sessions: Array.from(data.sessions),
        firstUsed: data.firstUsed,
        lastUsed: data.lastUsed
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 指定期間のセッションを取得
   */
  private async getSessionsInPeriod(startDate?: Date, endDate?: Date): Promise<ChatSession[]> {
    const filter = {
      startDate,
      endDate,
      limit: 10000 // 大きな値を設定して全データを取得
    };

    const searchResult = await this.chatHistoryService.searchSessions(filter);
    return searchResult.sessions;
  }

  /**
   * トレンド分析
   */
  private analyzeTrends(activities: PeriodActivity[]): ActivityReport['trends'] {
    if (activities.length < 2) {
      return {
        sessionTrend: 'stable',
        messageTrend: 'stable',
        engagementTrend: 'stable'
      };
    }

    const midPoint = Math.floor(activities.length / 2);
    const firstHalf = activities.slice(0, midPoint);
    const secondHalf = activities.slice(midPoint);

    const firstHalfAvgSessions = firstHalf.reduce((sum, a) => sum + a.sessionCount, 0) / firstHalf.length;
    const secondHalfAvgSessions = secondHalf.reduce((sum, a) => sum + a.sessionCount, 0) / secondHalf.length;

    const firstHalfAvgMessages = firstHalf.reduce((sum, a) => sum + a.messageCount, 0) / firstHalf.length;
    const secondHalfAvgMessages = secondHalf.reduce((sum, a) => sum + a.messageCount, 0) / secondHalf.length;

    const firstHalfAvgEngagement = firstHalf.reduce((sum, a) => sum + a.averageSessionLength, 0) / firstHalf.length;
    const secondHalfAvgEngagement = secondHalf.reduce((sum, a) => sum + a.averageSessionLength, 0) / secondHalf.length;

    const sessionTrend = this.getTrend(firstHalfAvgSessions, secondHalfAvgSessions);
    const messageTrend = this.getTrend(firstHalfAvgMessages, secondHalfAvgMessages);
    const engagementTrend = this.getTrend(firstHalfAvgEngagement, secondHalfAvgEngagement);

    return {
      sessionTrend,
      messageTrend,
      engagementTrend
    };
  }

  /**
   * トレンド方向を判定
   */
  private getTrend(first: number, second: number): 'increasing' | 'decreasing' | 'stable' {
    const threshold = 0.1; // 10%の変化を閾値とする
    const change = (second - first) / first;

    if (change > threshold) return 'increasing';
    if (change < -threshold) return 'decreasing';
    return 'stable';
  }
} 