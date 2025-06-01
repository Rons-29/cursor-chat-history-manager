import { Logger } from '../server/utils/Logger.js'
import { ChatHistoryService } from '../services/ChatHistoryService.js'
import { LoadTest } from './LoadTest.js'

interface ScalabilityTestConfig {
  initialUsers: number
  maxUsers: number
  stepSize: number
  stepDuration: number
  targetRPS: number
}

interface ScalabilityTestResult {
  steps: Array<{
    concurrentUsers: number
    results: {
      averageResponseTime: number
      p95ResponseTime: number
      p99ResponseTime: number
      errorRate: number
      throughput: number
      memoryUsage: {
        max: number
        average: number
      }
    }
  }>
  recommendations: {
    maxConcurrentUsers: number
    optimalConcurrentUsers: number
    bottlenecks: string[]
  }
}

export class ScalabilityTest {
  private logger: Logger
  private service: ChatHistoryService
  private config: ScalabilityTestConfig

  constructor(
    logger: Logger,
    service: ChatHistoryService,
    config: ScalabilityTestConfig
  ) {
    this.logger = logger
    this.service = service
    this.config = config
  }

  async run(): Promise<ScalabilityTestResult> {
    const steps: ScalabilityTestResult['steps'] = []
    let currentUsers = this.config.initialUsers

    while (currentUsers <= this.config.maxUsers) {
      this.logger.info(`スケーラビリティテスト: ${currentUsers}ユーザー`, {
        step: currentUsers / this.config.stepSize,
      })

      const loadTest = new LoadTest(this.logger, this.service, {
        concurrentUsers: currentUsers,
        duration: this.config.stepDuration,
        rampUpTime: 0,
        targetRPS: this.config.targetRPS,
      })

      const results = await loadTest.run()
      steps.push({
        concurrentUsers: currentUsers,
        results: {
          averageResponseTime: results.averageResponseTime,
          p95ResponseTime: results.p95ResponseTime,
          p99ResponseTime: results.p99ResponseTime,
          errorRate: results.failedRequests / results.totalRequests,
          throughput: results.successfulRequests / (this.config.stepDuration / 1000),
          memoryUsage: {
            max: results.maxMemoryUsage,
            average: results.averageMemoryUsage,
          },
        },
      })

      // エラー率が閾値を超えた場合、テストを終了
      if (results.failedRequests / results.totalRequests > 0.1) {
        break
      }

      currentUsers += this.config.stepSize
    }

    const recommendations = this.analyzeResults(steps)

    return {
      steps,
      recommendations,
    }
  }

  private analyzeResults(steps: ScalabilityTestResult['steps']): ScalabilityTestResult['recommendations'] {
    const bottlenecks: string[] = []
    let maxConcurrentUsers = 0
    let optimalConcurrentUsers = 0

    for (const step of steps) {
      const { results } = step

      // エラー率が5%を超える場合
      if (results.errorRate > 0.05) {
        bottlenecks.push(`エラー率が高すぎます (${(results.errorRate * 100).toFixed(1)}%)`)
      }

      // レスポンスタイムが200msを超える場合
      if (results.p95ResponseTime > 200) {
        bottlenecks.push(`レスポンスタイムが遅すぎます (${results.p95ResponseTime.toFixed(0)}ms)`)
      }

      // メモリ使用量が1GBを超える場合
      if (results.memoryUsage.max > 1024 * 1024 * 1024) {
        bottlenecks.push(`メモリ使用量が高すぎます (${(results.memoryUsage.max / 1024 / 1024).toFixed(0)}MB)`)
      }

      // エラー率が1%未満の最大ユーザー数を記録
      if (results.errorRate < 0.01) {
        maxConcurrentUsers = step.concurrentUsers
      }

      // パフォーマンスが最適なユーザー数を記録
      if (results.averageResponseTime < 100 && results.errorRate < 0.01) {
        optimalConcurrentUsers = step.concurrentUsers
      }
    }

    return {
      maxConcurrentUsers,
      optimalConcurrentUsers,
      bottlenecks,
    }
  }
} 