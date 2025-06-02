import { EventEmitter } from 'events'
import { Logger } from '../server/utils/Logger.js'
import { ChatHistoryService } from '../services/ChatHistoryService.js'

interface LoadTestConfig {
  concurrentUsers: number
  duration: number
  rampUpTime: number
  targetRPS: number
}

interface LoadTestResult {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  maxMemoryUsage: number
  averageMemoryUsage: number
  errors: Array<{
    type: string
    count: number
    messages: string[]
  }>
}

interface MemoryUsage {
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
  timestamp: Date
}

export class LoadTest extends EventEmitter {
  private logger: Logger
  private service: ChatHistoryService
  private config: LoadTestConfig
  private memoryUsage: MemoryUsage[] = []
  private startTime: Date | null = null
  private endTime: Date | null = null

  constructor(
    logger: Logger,
    service: ChatHistoryService,
    config: LoadTestConfig
  ) {
    super()
    this.logger = logger
    this.service = service
    this.config = config
  }

  async run(): Promise<LoadTestResult> {
    this.startTime = new Date()
    this.startMemoryMonitoring()

    const results = await this.executeLoadTest()
    const memoryStats = this.calculateMemoryStats()

    this.endTime = new Date()
    this.stopMemoryMonitoring()

    return {
      ...results,
      maxMemoryUsage: memoryStats.max,
      averageMemoryUsage: memoryStats.average,
    }
  }

  private async executeLoadTest(): Promise<
    Omit<LoadTestResult, 'maxMemoryUsage' | 'averageMemoryUsage'>
  > {
    const results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[],
      errors: new Map<string, { count: number; messages: string[] }>(),
    }

    const userPromises = Array.from(
      { length: this.config.concurrentUsers },
      (_, i) => this.simulateUser(i)
    )

    await Promise.all(userPromises)

    return {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      averageResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 99),
      errors: Array.from(results.errors.entries()).map(
        ([type, { count, messages }]) => ({
          type,
          count,
          messages,
        })
      ),
    }
  }

  private async simulateUser(userId: number): Promise<void> {
    const startTime = Date.now()
    const endTime = startTime + this.config.duration

    while (Date.now() < endTime) {
      try {
        const start = performance.now()
        await this.executeRandomOperation()
        const responseTime = performance.now() - start

        this.emit('request', {
          userId,
          responseTime,
          success: true,
        })
      } catch (error) {
        this.emit('request', {
          userId,
          error,
          success: false,
        })
      }

      // 目標RPSに基づいて待機時間を計算
      const waitTime = 1000 / this.config.targetRPS
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  private async executeRandomOperation(): Promise<void> {
    const operations = [
      this.createSession,
      this.addMessage,
      this.searchSessions,
      this.getSession,
    ]
    const operation = operations[Math.floor(Math.random() * operations.length)]
    await operation()
  }

  private async createSession(): Promise<void> {
    await this.service.createSession({
      id: Date.now().toString(),
      title: `Test Session ${Date.now()}`,
      messages: [],
      tags: ['test', 'load-test'],
      startTime: new Date(),
    })
  }

  private async addMessage(): Promise<void> {
    const result = await this.service.searchSessions({
      page: 1,
      pageSize: 1000,
    })
    const sessions = result.sessions
    if (sessions.length === 0) return

    const sessionId = sessions[Math.floor(Math.random() * sessions.length)].id
    await this.service.addMessage(sessionId, {
      role: 'user',
      content: `Test message ${Date.now()}`,
    })
  }

  private async searchSessions(): Promise<void> {
    await this.service.searchSessions({
      keyword: 'test',
      page: 1,
      pageSize: 10,
    })
  }

  private async getSession(): Promise<void> {
    const result = await this.service.searchSessions({
      page: 1,
      pageSize: 1000,
    })
    const sessions = result.sessions
    if (sessions.length === 0) return

    const sessionId = sessions[Math.floor(Math.random() * sessions.length)].id
    await this.service.getSession(sessionId)
  }

  private startMemoryMonitoring(): void {
    this.memoryUsage = []
    const interval = setInterval(() => {
      const usage = process.memoryUsage()
      this.memoryUsage.push({
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
        timestamp: new Date(),
      })
    }, 1000)

    setTimeout(() => clearInterval(interval), this.config.duration)
  }

  private stopMemoryMonitoring(): void {
    // メモリ監視の停止処理
  }

  private calculateMemoryStats(): { max: number; average: number } {
    const heapUsed = this.memoryUsage.map(m => m.heapUsed)
    return {
      max: Math.max(...heapUsed),
      average: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length,
    }
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index]
  }
}
