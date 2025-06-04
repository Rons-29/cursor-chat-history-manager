/**
 * ChatFlow ポート設定統一管理
 * 全サービスのポート設定を一元化
 */

export interface PortConfig {
  readonly api: number
  readonly web: {
    readonly dev: number
    readonly prod: number
  }
  readonly demo: number
}

/**
 * 統一ポート設定
 */
export const PORTS: PortConfig = {
  // APIサーバー (統合API)
  api: 3001,
  
  // メインWebUI
  web: {
    dev: 5173,   // 開発環境
    prod: 5000   // 本番環境
  },
  
  // デモ・テスト用
  demo: 5180
} as const

/**
 * 環境別ポート取得
 */
export function getWebPort(): number {
  return process.env.NODE_ENV === 'production' ? PORTS.web.prod : PORTS.web.dev
}

/**
 * APIベースURL生成
 */
export function getApiBaseUrl(): string {
  return `http://localhost:${PORTS.api}`
}

/**
 * WebUIベースURL生成
 */
export function getWebBaseUrl(): string {
  return `http://localhost:${getWebPort()}`
}

/**
 * 全ポート設定情報
 */
export function getPortInfo(): Record<string, number | string> {
  return {
    'API Server': PORTS.api,
    'Web UI (Dev)': PORTS.web.dev,
    'Web UI (Prod)': PORTS.web.prod,
    'Demo': PORTS.demo,
    'Current Web': getWebPort(),
    'API Base URL': getApiBaseUrl(),
    'Web Base URL': getWebBaseUrl()
  }
}

export default PORTS 