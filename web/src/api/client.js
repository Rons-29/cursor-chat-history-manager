// APIクライアント設定
const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

// 進捗コールバック用の型定義
export class ProgressTracker {
  constructor() {
    this.callbacks = new Set()
  }

  subscribe(callback) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  notify(progress) {
    this.callbacks.forEach(callback => callback(progress))
  }
}

// HTTPクライアント
class ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.progressTracker = new ProgressTracker()
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error(`API Request failed: ${url}`, error);
            throw error;
        }
    }

    // 進捗付きリクエスト（長時間の処理用）
    async requestWithProgress(endpoint, options = {}, onProgress = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            // ストリーミング対応（将来のWebSocket代替）
            const reader = response.body?.getReader();
            if (reader && onProgress) {
                let result = '';
                let progress = 0;
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    result += new TextDecoder().decode(value);
                    progress = Math.min(progress + 10, 90); // 仮の進捗計算
                    onProgress({ progress, message: '処理中...' });
                }
                
                onProgress({ progress: 100, message: '完了' });
                return JSON.parse(result);
            }

            return await response.json();
        }
        catch (error) {
            console.error(`API Request failed: ${url}`, error);
            throw error;
        }
    }

    // セッション一覧取得
    async getSessions(params = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        const endpoint = `/sessions${query ? `?${query}` : ''}`;
        return this.request(endpoint);
    }

    // 特定セッション取得
    async getSession(id) {
        return this.request(`/sessions/${id}`);
    }

    // 統計情報取得
    async getStats() {
        return this.request('/integration/stats');
    }

    // 統合機能 - Cursorスキャン（進捗付き）
    async scanCursor(options = {}, onProgress = null) {
        return this.requestWithProgress('/integration/cursor/scan', {
            method: 'POST',
            body: JSON.stringify(options),
        }, onProgress);
    }

    // 統合機能 - 初期化（進捗付き）
    async initializeIntegration(config = {}, onProgress = null) {
        return this.requestWithProgress('/integration/initialize', {
            method: 'POST',
            body: JSON.stringify(config),
        }, onProgress);
    }

    // 統合機能 - SQLite移行（進捗付き）
    async migrateSqlite(options = {}, onProgress = null) {
        return this.requestWithProgress('/integration/sqlite-migrate', {
            method: 'POST',
            body: JSON.stringify(options),
        }, onProgress);
    }

    // 統合機能 - 高速検索（進捗付き）
    async sqliteSearch(keyword, options = {}, onProgress = null) {
        return this.requestWithProgress('/integration/sqlite-search', {
            method: 'POST',
            body: JSON.stringify({ keyword, options }),
        }, onProgress);
    }

    // 統合機能 - 監視開始
    async startWatching() {
        return this.request('/integration/watch/start', {
            method: 'POST',
        });
    }

    // 統合機能 - 監視停止
    async stopWatching() {
        return this.request('/integration/watch/stop', {
            method: 'POST',
        });
    }

    // 統合機能 - 設定取得
    async getIntegrationSettings() {
        return this.request('/integration/settings');
    }

    // 統合機能 - 設定保存
    async saveIntegrationSettings(settings) {
        return this.request('/integration/settings', {
            method: 'POST',
            body: JSON.stringify(settings),
        });
    }

    // 統合機能 - ログ取得
    async getIntegrationLogs(params = {}) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                searchParams.append(key, String(value));
            }
        });
        const query = searchParams.toString();
        const endpoint = `/integration/logs${query ? `?${query}` : ''}`;
        return this.request(endpoint);
    }

    // 検索実行
    async search(keyword, filters = {}) {
        return this.request('/search', {
            method: 'POST',
            body: JSON.stringify({ keyword, filters }),
        });
    }

    // セッション作成（開発・テスト用）
    async createSession(data) {
        return this.request('/sessions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ヘルスチェック
    async healthCheck() {
        return this.request('/health');
    }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// React Query用のキー生成関数
export const queryKeys = {
    sessions: (params) => ['sessions', params],
    session: (id) => ['sessions', id],
    stats: () => ['stats'],
    search: (keyword, filters) => ['search', keyword, filters],
    integrationStats: () => ['integration', 'stats'],
    integrationSettings: () => ['integration', 'settings'],
    integrationLogs: (params) => ['integration', 'logs', params],
};
