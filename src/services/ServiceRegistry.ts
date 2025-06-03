/**
 * サービスレジストリ - 全サービスの一元管理
 * モジュール重複インスタンス問題を解決
 */

import type ClaudeDevIntegrationService from './ClaudeDevIntegrationService.js'
import type { ChatHistoryService } from './ChatHistoryService.js'
import type { IntegrationService } from './IntegrationService.js'

interface ServiceRegistry {
  claudeDev: ClaudeDevIntegrationService | null
  chatHistory: ChatHistoryService | null
  integration: IntegrationService | null
}

/**
 * グローバルサービスレジストリ
 */
class GlobalServiceRegistry {
  private services: ServiceRegistry = {
    claudeDev: null,
    chatHistory: null,
    integration: null,
  }

  /**
   * Claude Dev統合サービスの設定
   */
  setClaudeDevService(service: ClaudeDevIntegrationService): void {
    this.services.claudeDev = service
    console.log('🔧 ServiceRegistry: Claude Dev統合サービスが登録されました:', {
      hasService: !!service,
      serviceType: typeof service,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Claude Dev統合サービスの取得
   */
  getClaudeDevService(): ClaudeDevIntegrationService {
    console.log('📖 ServiceRegistry: Claude Devサービス取得要求:', {
      hasService: !!this.services.claudeDev,
      type: typeof this.services.claudeDev,
      isNull: this.services.claudeDev === null,
      timestamp: new Date().toISOString(),
    })

    if (!this.services.claudeDev) {
      throw new Error(
        'Claude Dev統合サービスが初期化されていません。サーバーを再起動してください。'
      )
    }
    return this.services.claudeDev
  }

  /**
   * チャット履歴サービスの設定
   */
  setChatHistoryService(service: ChatHistoryService): void {
    this.services.chatHistory = service
  }

  /**
   * チャット履歴サービスの取得
   */
  getChatHistoryService(): ChatHistoryService {
    if (!this.services.chatHistory) {
      throw new Error('チャット履歴サービスが初期化されていません')
    }
    return this.services.chatHistory
  }

  /**
   * 統合サービスの設定
   */
  setIntegrationService(service: IntegrationService): void {
    this.services.integration = service
  }

  /**
   * 統合サービスの取得
   */
  getIntegrationService(): IntegrationService {
    if (!this.services.integration) {
      throw new Error('統合サービスが初期化されていません')
    }
    return this.services.integration
  }

  /**
   * 全サービスの状態取得
   */
  getServiceStatus() {
    return {
      claudeDev: !!this.services.claudeDev,
      chatHistory: !!this.services.chatHistory,
      integration: !!this.services.integration,
    }
  }

  /**
   * サービスレジストリの詳細情報
   */
  getDebugInfo() {
    return {
      services: {
        claudeDev: {
          exists: !!this.services.claudeDev,
          type: typeof this.services.claudeDev,
          isNull: this.services.claudeDev === null,
          isUndefined: this.services.claudeDev === undefined,
        },
        chatHistory: {
          exists: !!this.services.chatHistory,
          type: typeof this.services.chatHistory,
        },
        integration: {
          exists: !!this.services.integration,
          type: typeof this.services.integration,
        },
      },
      timestamp: new Date().toISOString(),
    }
  }
}

// グローバルインスタンス（シングルトン）
const serviceRegistry = new GlobalServiceRegistry()

export default serviceRegistry
export { type ServiceRegistry }
