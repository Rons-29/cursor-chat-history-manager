import LRU from 'lru-cache'
import { Logger } from './Logger.js'

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
  }

  constructor(config: CacheConfig, logger: Logger) {
    this.cache = new LRU({
      max: config.max,
      maxAge: config.maxAge,
      updateAgeOnGet: config.updateAgeOnGet
    })
    this.logger = logger
    this.stats = {
      hits: 0,
      misses: 0
    }
  }

  /**
   * キャッシュに値を設定
   */
  set(key: string, value: T): void {
    try {
      this.cache.set(key, value)
      this.logger.debug(`キャッシュに値を設定: ${key}`)
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
        this.logger.debug(`キャッシュミス: ${key}`)
        return undefined
      }
      this.stats.hits++
      this.logger.debug(`キャッシュヒット: ${key}`)
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
      this.logger.debug(`キャッシュから値を削除: ${key}`)
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
        misses: 0
      }
      this.logger.info('キャッシュをクリアしました')
    } catch (error) {
      this.logger.error('キャッシュのクリアに失敗しました:', error)
      throw error
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: Array.from(this.cache.keys())
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
} 