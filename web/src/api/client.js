// APIクライアント設定
const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
// HTTPクライアント
class ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
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
};
