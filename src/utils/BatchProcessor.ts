import { Logger } from '../server/utils/Logger.js'

interface BatchProcessorConfig<T> {
  maxSize: number
  maxWaitTime: number
  onBatch: (items: T[]) => Promise<void>
}

export class BatchProcessor<T> {
  private items: T[] = []
  private timer: NodeJS.Timeout | null = null
  private config: BatchProcessorConfig<T>
  private logger: Logger

  constructor(config: BatchProcessorConfig<T>, logger: Logger) {
    this.config = config
    this.logger = logger
  }

  async add(item: T): Promise<void> {
    this.items.push(item)

    if (this.items.length >= this.config.maxSize) {
      await this.processBatch()
    } else if (!this.timer) {
      this.timer = setTimeout(
        () => this.processBatch(),
        this.config.maxWaitTime
      )
    }
  }

  private async processBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.items.length === 0) return

    const batch = [...this.items]
    this.items = []

    try {
      await this.config.onBatch(batch)
    } catch (error) {
      await this.logger.error('バッチ処理エラー', { error })
    }
  }
}
