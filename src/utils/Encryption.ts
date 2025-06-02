import crypto from 'crypto'
import fs from 'fs-extra'
import { Logger } from '../server/utils/Logger.js'

interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  saltLength: number
  iterations: number
  digest: string
}

export class Encryption {
  private logger: Logger
  private config: EncryptionConfig
  private key: Buffer

  constructor(
    logger: Logger,
    masterKey: string,
    config: Partial<EncryptionConfig> = {}
  ) {
    this.logger = logger
    this.config = {
      algorithm: config.algorithm ?? 'aes-256-gcm',
      keyLength: config.keyLength ?? 32,
      ivLength: config.ivLength ?? 16,
      saltLength: config.saltLength ?? 16,
      iterations: config.iterations ?? 100000,
      digest: config.digest ?? 'sha512',
    }

    // マスターキーから暗号化キーを生成
    this.key = crypto.pbkdf2Sync(
      masterKey,
      'master-salt',
      this.config.iterations,
      this.config.keyLength,
      this.config.digest
    )
  }

  async encrypt(data: string | Buffer): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.config.ivLength)
      const salt = crypto.randomBytes(this.config.saltLength)

      // データの暗号化
      const cipher = crypto.createCipheriv(this.config.algorithm, this.key, iv)
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()])

      // 認証タグの取得
      const authTag = (cipher as any).getAuthTag()

      // 暗号化データの結合
      const result = Buffer.concat([salt, iv, authTag, encrypted])

      return result.toString('base64')
    } catch (error) {
      this.logger.error('暗号化に失敗しました', { error })
      throw new Error('暗号化に失敗しました')
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const data = Buffer.from(encryptedData, 'base64')

      // データの分解
      const salt = data.slice(0, this.config.saltLength)
      const iv = data.slice(
        this.config.saltLength,
        this.config.saltLength + this.config.ivLength
      )
      const authTag = data.slice(
        this.config.saltLength + this.config.ivLength,
        this.config.saltLength + this.config.ivLength + 16
      )
      const encrypted = data.slice(
        this.config.saltLength + this.config.ivLength + 16
      )

      // 復号化
      const decipher = crypto.createDecipheriv(
        this.config.algorithm,
        this.key,
        iv
      )
      ;(decipher as any).setAuthTag(authTag)

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ])

      return decrypted.toString()
    } catch (error) {
      this.logger.error('復号化に失敗しました', { error })
      throw new Error('復号化に失敗しました')
    }
  }

  async encryptObject<T extends object>(obj: T): Promise<string> {
    const json = JSON.stringify(obj)
    return this.encrypt(json)
  }

  async decryptObject<T extends object>(encryptedData: string): Promise<T> {
    const decrypted = await this.decrypt(encryptedData)
    return JSON.parse(decrypted) as T
  }

  async encryptFile(inputPath: string, outputPath: string): Promise<void> {
    try {
      const data = await fs.readFile(inputPath)
      const encrypted = await this.encrypt(data)
      await fs.writeFile(outputPath, encrypted)
    } catch (error) {
      this.logger.error('ファイルの暗号化に失敗しました', { error, inputPath })
      throw new Error('ファイルの暗号化に失敗しました')
    }
  }

  async decryptFile(inputPath: string, outputPath: string): Promise<void> {
    try {
      const encrypted = await fs.readFile(inputPath, 'utf-8')
      const decrypted = await this.decrypt(encrypted)
      await fs.writeFile(outputPath, decrypted)
    } catch (error) {
      this.logger.error('ファイルの復号化に失敗しました', { error, inputPath })
      throw new Error('ファイルの復号化に失敗しました')
    }
  }

  async generateKey(): Promise<string> {
    return crypto.randomBytes(this.config.keyLength).toString('hex')
  }

  async hash(data: string): Promise<string> {
    const salt = crypto.randomBytes(this.config.saltLength)
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        data,
        salt,
        this.config.iterations,
        this.config.keyLength,
        this.config.digest,
        (err, derivedKey) => {
          if (err) reject(err)
          resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'))
        }
      )
    })
  }

  async verifyHash(data: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':')
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        data,
        Buffer.from(salt, 'hex'),
        this.config.iterations,
        this.config.keyLength,
        this.config.digest,
        (err, derivedKey) => {
          if (err) reject(err)
          resolve(key === derivedKey.toString('hex'))
        }
      )
    })
  }
}
