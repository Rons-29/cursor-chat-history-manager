import LRU from 'lru-cache'
import { Logger } from '../server/utils/Logger.js'

interface CacheConfig {
  max: number
  maxAge: number
  updateAgeOnGet: boolean
}

interface CacheStats {
  size: number
  hits: number
  misses: number
  keys: string[]
}

export class CacheManager<T> {
  private cache: LRU<string, T>
  private logger: Logger
  private stats: {
    hits: number
    misses: number
    sets: number
    deletes: number
    lastStatsLog: number
  }

  constructor(config: CacheConfig, logger: Logger) {
    this.cache = new LRU({
      max: config.max,
      maxAge: config.maxAge,
      updateAgeOnGet: config.updateAgeOnGet,
    })
    this.logger = logger
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      lastStatsLog: Date.now(),
    }
  }

  /**
   * キャッシュに値を設定
   */
  set(key: string, value: T): void {
    try {
      this.cache.set(key, value)
      this.stats.sets++

      // 1000回の操作ごとにまとめて統計ログを出力
      if (this.stats.sets % 1000 === 0) {
        this.logStats()
      }
    } catch (error) {
      this.logger.error('キャッシュの設定に失敗しました:', error)
      throw error
    }
  }

  /**
   * キャッシュから値を取得
   */
  get(key: string): T | undefined {
    try {
      const value = this.cache.get(key)
      if (value === undefined) {
        this.stats.misses++
        // デバッグログ削除: 大量出力の原因
        return undefined
      }
      this.stats.hits++
      // デバッグログ削除: 大量出力の原因
      return value
    } catch (error) {
      this.logger.error('キャッシュの取得に失敗しました:', error)
      throw error
    }
  }

  /**
   * キャッシュから値を削除
   */
  delete(key: string): void {
    try {
      this.cache.del(key)
      this.stats.deletes++
      // デバッグログ削除: 大量出力の原因
    } catch (error) {
      this.logger.error('キャッシュの削除に失敗しました:', error)
      throw error
    }
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    try {
      this.cache.clear()
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        lastStatsLog: Date.now(),
      }
      this.logger.info('キャッシュをクリアしました')
    } catch (error) {
      this.logger.error('キャッシュのクリアに失敗しました:', error)
      throw error
    }
  }

  /**
   * キャッシュの統計情報を出力
   */
  private logStats(): void {
    const now = Date.now()
    const duration = now - this.stats.lastStatsLog
    const total = this.stats.hits + this.stats.misses
    const hitRate =
      total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) : '0.0'

    this.logger.info('キャッシュ統計情報', {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      hitRate: `${hitRate}%`,
      duration: `${Math.round(duration / 1000)}秒間`,
    })

    this.stats.lastStatsLog = now
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * キャッシュにキーが存在するか確認
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * キャッシュのサイズを取得
   */
  size(): number {
    return this.cache.size
  }

  /**
   * キャッシュの最大サイズを取得
   */
  maxSize(): number {
    return this.cache.max
  }

  /**
   * キャッシュの有効期限を取得
   */
  maxAge(): number {
    return this.cache.maxAge
  }

  /**
   * 強制的に統計情報を出力
   */
  forceLogStats(): void {
    this.logStats()
  }
}
