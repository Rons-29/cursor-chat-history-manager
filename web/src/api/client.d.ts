export interface ApiSession {
    id: string;
    title: string;
    startTime: string;
    endTime?: string;
    metadata: {
        totalMessages: number;
        tags?: string[];
        description?: string;
        source?: string;
    };
    messages: ApiMessage[];
}
export interface ApiMessage {
    id: string;
    timestamp: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: {
        sessionId?: string;
        [key: string]: any;
    };
}
export interface ApiSessionsResponse {
    sessions: ApiSession[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore?: boolean;
    };
}
export interface ApiStats {
    totalSessions: number;
    totalMessages: number;
    thisMonthMessages: number;
    activeProjects: number;
    lastUpdated: string;
}
export interface ApiSearchResponse {
    keyword: string;
    results: ApiSession[];
    total: number;
}
declare class ApiClient {
    private baseUrl;
    constructor(baseUrl?: string);
    private request;
    getSessions(params?: {
        page?: number;
        limit?: number;
        keyword?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<ApiSessionsResponse>;
    getSession(id: string): Promise<ApiSession>;
    getStats(): Promise<ApiStats>;
    search(keyword: string, filters?: Record<string, any>): Promise<ApiSearchResponse>;
    createSession(data: {
        title?: string;
        description?: string;
        tags?: string[];
    }): Promise<ApiSession>;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
    }>;
}
export declare const apiClient: ApiClient;
export declare const queryKeys: {
    sessions: (params?: any) => readonly ["sessions", any];
    session: (id: string) => readonly ["sessions", string];
    stats: () => readonly ["stats"];
    search: (keyword: string, filters?: any) => readonly ["search", string, any];
};
export {};
