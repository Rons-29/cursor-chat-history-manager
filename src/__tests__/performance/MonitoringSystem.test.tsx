import { describe, it, expect } from '@jest/globals'
import { Logger } from '../../server/utils/Logger.js'

describe('MonitoringSystem パフォーマンステスト', () => {
  let logger: Logger

  beforeEach(() => {
    logger = Logger.getInstance('./logs')
  })

  it('Loggerが正常に初期化できること', () => {
    expect(logger).toBeDefined()
  })
}) 