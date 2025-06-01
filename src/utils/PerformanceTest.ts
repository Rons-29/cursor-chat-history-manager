import { Logger } from './Logger.js'

export interface TestResult {
  name: string
  iterations: number
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  p95Time: number
  error?: Error
}

interface TestCase {
  name: string
  iterations: number
  fn: () => Promise<void>
}

interface PerformanceMetrics {
  testName: string
  duration: string
  memoryUsage: string
  opsPerSecond: string
}

export class PerformanceTest {
  private logger: Logger
  private results: TestResult[] = []

  constructor(logger: Logger) {
    this.logger = logger
  }

  async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = process.hrtime()
    const startMemory = process.memoryUsage().heapUsed

    try {
      for (let i = 0; i < testCase.iterations; i++) {
        await testCase.fn()
      }

      const [seconds, nanoseconds] = process.hrtime(startTime)
      const duration = seconds * 1000 + nanoseconds / 1000000 // ミリ秒に変換
      const endMemory = process.memoryUsage().heapUsed
      const memoryUsage = endMemory - startMemory

      const result: TestResult = {
        name: testCase.name,
        iterations: testCase.iterations,
        totalTime: duration,
        averageTime: duration / testCase.iterations,
        minTime: duration,
        maxTime: duration,
        p95Time: duration,
      }

      this.results.push(result)
      const metrics: PerformanceMetrics = {
        testName: testCase.name,
        duration: `${duration.toFixed(2)}ms`,
        memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        opsPerSecond: result.averageTime.toFixed(2),
      }
      await this.logger.info('パフォーマンステスト完了', metrics)

      return result
    } catch (error) {
      const result: TestResult = {
        name: testCase.name,
        iterations: testCase.iterations,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0,
        error: error instanceof Error ? error : new Error(String(error)),
      }

      this.results.push(result)
      await this.logger.error('パフォーマンステストエラー', {
        testName: testCase.name,
        error,
      })

      return result
    }
  }

  async runTests(testCases: TestCase[]): Promise<TestResult[]> {
    this.results = []
    for (const testCase of testCases) {
      await this.runTest(testCase)
    }
    return this.results
  }

  getResults(): TestResult[] {
    return this.results
  }

  generateReport(): string {
    const report = ['パフォーマンステスト結果\n']

    for (const result of this.results) {
      report.push(`テスト: ${result.name}`)
      if (result.error) {
        report.push(`  エラー: ${result.error.message}`)
      } else {
        report.push(`  実行時間: ${result.totalTime.toFixed(2)}ms`)
        report.push(`  メモリ使用量: ${(result.totalTime / 1024 / 1024).toFixed(2)}MB`)
        report.push(`  1秒あたりの操作数: ${result.averageTime.toFixed(2)}`)
      }
      report.push('')
    }

    return report.join('\n')
  }
} 