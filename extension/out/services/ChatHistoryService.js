"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHistoryService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class ChatHistoryService {
    constructor(config) {
        this.sessions = new Map();
        this.config = config;
        this.dataPath = path.join(config.storagePath, 'sessions.json');
    }
    async initialize() {
        await fs.ensureDir(this.config.storagePath);
        await this.loadSessions();
    }
    async createSession(options) {
        const session = {
            id: (0, uuid_1.v4)(),
            title: options.title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: options.tags || [],
            metadata: {
                project: options.project,
                source: 'extension'
            }
        };
        this.sessions.set(session.id, session);
        await this.saveSessions();
        return session;
    }
    async addMessage(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const newMessage = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            ...message
        };
        session.messages.push(newMessage);
        session.updatedAt = new Date();
        await this.saveSessions();
    }
    async searchSessions(options) {
        let results = Array.from(this.sessions.values());
        if (options.keyword) {
            const keyword = options.keyword.toLowerCase();
            results = results.filter(session => session.title.toLowerCase().includes(keyword) ||
                session.messages.some(msg => msg.content.toLowerCase().includes(keyword)));
        }
        if (options.tags && options.tags.length > 0) {
            results = results.filter(session => options.tags.some(tag => session.tags.includes(tag)));
        }
        results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        if (options.limit) {
            results = results.slice(0, options.limit);
        }
        return results;
    }
    async getStats() {
        const sessions = Array.from(this.sessions.values());
        const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
        let storageSize = 0;
        try {
            const stats = await fs.stat(this.dataPath);
            storageSize = stats.size;
        }
        catch (error) {
            // ファイルが存在しない場合は0
        }
        return {
            totalSessions: sessions.length,
            totalMessages,
            storageSize
        };
    }
    async loadSessions() {
        try {
            if (await fs.pathExists(this.dataPath)) {
                const data = await fs.readJSON(this.dataPath);
                this.sessions.clear();
                for (const sessionData of data.sessions || []) {
                    // 日付文字列をDateオブジェクトに変換
                    sessionData.createdAt = new Date(sessionData.createdAt);
                    sessionData.updatedAt = new Date(sessionData.updatedAt);
                    sessionData.messages.forEach((msg) => {
                        msg.timestamp = new Date(msg.timestamp);
                    });
                    this.sessions.set(sessionData.id, sessionData);
                }
            }
        }
        catch (error) {
            console.error('Failed to load sessions:', error);
        }
    }
    async saveSessions() {
        try {
            const data = {
                sessions: Array.from(this.sessions.values()),
                savedAt: new Date().toISOString()
            };
            await fs.writeJSON(this.dataPath, data, { spaces: 2 });
        }
        catch (error) {
            console.error('Failed to save sessions:', error);
            throw error;
        }
    }
}
exports.ChatHistoryService = ChatHistoryService;
//# sourceMappingURL=ChatHistoryService.js.map