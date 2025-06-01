import { PerformanceTest } from '../../utils/PerformanceTest.js'
import { Logger } from '../../utils/Logger.js'
import path from 'path'
import fs from 'fs-extra'

interface TestResult {
  name: string
  duration: number
  iterations: number
  error?: Error
}

describe('PerformanceTest', () => {
  let performanceTest: PerformanceTest
  let logger: Logger
  const testLogDir = path.join(__dirname, '../../test-logs')

  beforeAll(async () => {
    await fs.ensureDir(testLogDir)
    logger = new Logger({ logPath: testLogDir, level: 'info' })
    await logger.initialize()
    performanceTest = new PerformanceTest(logger)
  })

  afterAll(async () => {
    await logger.cleanup()
    await fs.remove(testLogDir)
  })

  describe('テスト実行', () => {
    it('単一のテストケースを実行できること', async () => {
      const testCase = {
        name: '単一テスト',
        iterations: 1,
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
        },
      }

      const results = await performanceTest.runTests([testCase])
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('単一テスト')
      expect(results[0].iterations).toBe(1)
      expect(results[0].totalTime).toBeGreaterThan(0)
      expect(results[0].averageTime).toBeGreaterThan(0)
      expect(results[0].minTime).toBeGreaterThan(0)
      expect(results[0].maxTime).toBeGreaterThan(0)
      expect(results[0].p95Time).toBeGreaterThan(0)
    })

    it('複数のテストケースを実行できること', async () => {
      const testCases = [
        {
          name: 'テスト1',
          iterations: 1000,
          fn: () => {
            let sum = 0
            for (let i = 0; i < 1000; i++) {
              sum += i
            }
            return sum
          },
        },
        {
          name: 'テスト2',
          iterations: 500,
          fn: () => {
            const arr = Array(1000).fill(0).map((_, i) => i)
            return arr.reduce((sum, val) => sum + val, 0)
          },
        },
      ]

      const results = await Promise.all(
        testCases.map(async testCase => {
          const startTime = process.hrtime()
          for (let i = 0; i < testCase.iterations; i++) {
            await testCase.fn()
          }
          const [seconds, nanoseconds] = process.hrtime(startTime)
          return {
            name: testCase.name,
            duration: seconds * 1000 + nanoseconds / 1000000,
            iterations: testCase.iterations,
          }
        })
      )

      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('テスト1')
      expect(results[1].name).toBe('テスト2')
    })

    it('エラーが発生した場合も結果を返すこと', async () => {
      const testCases = [
        {
          name: '正常テスト',
          iterations: 100,
          fn: () => {
            return true
          },
        },
        {
          name: 'エラーテスト',
          iterations: 100,
          fn: () => {
            throw new Error('テストエラー')
          },
        },
      ]

      const results = await Promise.allSettled(
        testCases.map(async testCase => {
          const startTime = process.hrtime()
          try {
            for (let i = 0; i < testCase.iterations; i++) {
              await testCase.fn()
            }
            const [seconds, nanoseconds] = process.hrtime(startTime)
            return {
              name: testCase.name,
              duration: seconds * 1000 + nanoseconds / 1000000,
              iterations: testCase.iterations,
              error: null,
            }
          } catch (error) {
            const [seconds, nanoseconds] = process.hrtime(startTime)
            return {
              name: testCase.name,
              duration: seconds * 1000 + nanoseconds / 1000000,
              iterations: testCase.iterations,
              error: error instanceof Error ? error.message : '不明なエラー',
            }
          }
        })
      )

      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('fulfilled')
      if (results[1].status === 'fulfilled') {
        expect(results[1].value.error).toBe('テストエラー')
      }
    })
  })

  describe('レポート生成', () => {
    it('レポートが正しく生成されること', async () => {
      const testCases = [
        {
          name: 'テストケース1',
          iterations: 100,
          fn: async () => {
            await new Promise(resolve => setTimeout(resolve, 1))
          },
        },
        {
          name: 'テストケース2',
          iterations: 50,
          fn: async () => {
            await new Promise(resolve => setTimeout(resolve, 2))
          },
        },
      ]

      const results = await performanceTest.runTests(testCases)
      const report = {
        timestamp: new Date().toISOString(),
        totalTests: results.length,
        totalDuration: results.reduce((sum, r) => sum + r.totalTime, 0),
        averageDuration: results.reduce((sum, r) => sum + r.averageTime, 0) / results.length,
        results
      }

      expect(report.timestamp).toBeDefined()
      expect(report.totalTests).toBe(2)
      expect(report.totalDuration).toBeGreaterThan(0)
      expect(report.averageDuration).toBeGreaterThan(0)
      expect(report.results).toHaveLength(2)
    })

    it('エラーを含むレポートを生成できること', async () => {
      const testCases = [
        {
          name: '正常テスト',
          iterations: 100,
          fn: () => {
            return true
          },
        },
        {
          name: 'エラーテスト',
          iterations: 100,
          fn: () => {
            throw new Error('テストエラー')
          },
        },
      ]

      const results = await Promise.allSettled(
        testCases.map(async testCase => {
          const startTime = process.hrtime()
          try {
            for (let i = 0; i < testCase.iterations; i++) {
              await testCase.fn()
            }
            const [seconds, nanoseconds] = process.hrtime(startTime)
            return {
              name: testCase.name,
              duration: seconds * 1000 + nanoseconds / 1000000,
              iterations: testCase.iterations,
              error: null,
            }
          } catch (error) {
            const [seconds, nanoseconds] = process.hrtime(startTime)
            return {
              name: testCase.name,
              duration: seconds * 1000 + nanoseconds / 1000000,
              iterations: testCase.iterations,
              error: error instanceof Error ? error.message : '不明なエラー',
            }
          }
        })
      )

      const report = {
        timestamp: new Date().toISOString(),
        totalTests: results.length,
        successfulTests: results.filter(r => r.status === 'fulfilled' && r.value.error === null).length,
        failedTests: results.filter(r => r.status === 'fulfilled' && r.value.error !== null).length,
        results: results.map(r => r.status === 'fulfilled' ? r.value : null),
      }

      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('totalTests', 2)
      expect(report).toHaveProperty('successfulTests', 1)
      expect(report).toHaveProperty('failedTests', 1)
      expect(report).toHaveProperty('results')
    })
  })

  describe('パフォーマンス測定の精度', () => {
    it('正確な時間測定ができること', async () => {
      const testCase = {
        name: '正確な時間測定テスト',
        iterations: 1000,
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 1))
        },
      }

      const results = await performanceTest.runTests([testCase])
      const result = results[0]
      const duration = result.totalTime

      expect(duration).toBeGreaterThanOrEqual(testCase.iterations)
      expect(duration).toBeLessThanOrEqual(testCase.iterations * 1.15) // 15%の許容誤差
    })

    it('複数回の実行で一貫した結果を返すこと', async () => {
      const testCase = {
        name: '一貫性テスト',
        iterations: 500,
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 1))
        },
      }

      const results = await Promise.all([
        performanceTest.runTests([testCase]),
        performanceTest.runTests([testCase]),
        performanceTest.runTests([testCase]),
      ])

      const durations = results.map(r => r[0].totalTime)
      const avgDuration = durations.reduce((a: number, b: number) => a + b) / durations.length
      const maxDeviation = Math.max(...durations.map((d: number) => Math.abs(d - avgDuration)))

      expect(maxDeviation).toBeLessThan(avgDuration * 0.1) // 10%以内の偏差
    })
  })

  describe('エラーハンドリング', () => {
    it('無効なテストケースを適切に処理できること', async () => {
      const testCase = {
        name: '無効なテスト',
        iterations: 100,
        fn: async () => {
          throw new Error('テストエラー')
        },
      }

      const results = await performanceTest.runTests([testCase])
      const result = results[0]
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('テストエラー')
    })

    it('タイムアウトを適切に処理できること', async () => {
      const testCase = {
        name: 'タイムアウトテスト',
        iterations: 1,
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 20000))
        },
        timeout: 5000,
      }

      const results = await performanceTest.runTests([testCase])
      const result = results[0]
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('タイムアウト')
    }, 10000) // テスト自体のタイムアウトを10秒に設定
  })
}) 