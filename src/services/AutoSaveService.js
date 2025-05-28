"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSaveService = void 0;
const events_1 = require("events");
class AutoSaveService extends events_1.EventEmitter {
    constructor(chatHistoryService, configService) {
        super();
        this.currentSession = null;
        this.saveTimer = null;
        this.idleTimer = null;
        this.sessionStartTime = null;
        this.lastActivityTime = null;
        this.messageCount = 0;
        this.chatHistoryService = chatHistoryService;
        this.configService = configService;
    }
    /**
     * 自動保存を開始
     */
    async start() {
        const config = await this.getConfig();
        if (!config.enabled) {
            console.log('自動保存が無効になっています');
            return;
        }
        await this.createNewSession();
        this.startTimers();
        this.emit('started');
        console.log('自動保存を開始しました');
    }
    /**
     * 自動保存を停止
     */
    async stop() {
        this.stopTimers();
        if (this.currentSession) {
            await this.endCurrentSession();
        }
        this.emit('stopped');
        console.log('自動保存を停止しました');
    }
    /**
     * メッセージを保存
     */
    async saveMessage(content, role = 'user') {
        if (!this.currentSession) {
            await this.createNewSession();
        }
        if (this.currentSession) {
            await this.chatHistoryService.addMessage(this.currentSession.id, {
                role,
                content,
                metadata: {
                    tags: ['auto-saved'],
                    sessionId: this.currentSession.id
                }
            });
            this.messageCount++;
            this.lastActivityTime = new Date();
            // アイドルタイマーをリセット
            this.resetIdleTimer();
            this.emit('messageSaved', { content, role, sessionId: this.currentSession.id });
        }
    }
    /**
     * 新しいセッションを作成
     */
    async createNewSession() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sessionTitle = `自動保存セッション ${timestamp}`;
        this.currentSession = await this.chatHistoryService.createSession(sessionTitle, {
            tags: ['auto-save'],
            source: 'auto-save'
        });
        this.sessionStartTime = new Date();
        this.lastActivityTime = new Date();
        this.messageCount = 0;
        console.log(`新しい自動保存セッションを作成: ${this.currentSession.id}`);
        this.emit('sessionCreated', this.currentSession);
    }
    /**
     * 現在のセッションを終了
     */
    async endCurrentSession() {
        if (!this.currentSession) {
            return;
        }
        // セッション終了のメタデータを更新
        const endTime = new Date().toISOString();
        const duration = this.sessionStartTime
            ? Math.round((new Date().getTime() - this.sessionStartTime.getTime()) / 60000)
            : 0;
        // 最後のメッセージとしてセッション終了を記録
        await this.chatHistoryService.addMessage(this.currentSession.id, {
            role: 'assistant',
            content: `セッション終了 (時間: ${duration}分, メッセージ数: ${this.messageCount})`,
            metadata: {
                tags: ['session-end'],
                sessionId: this.currentSession.id
            }
        });
        console.log(`自動保存セッションを終了: ${this.currentSession.id} (${duration}分, ${this.messageCount}メッセージ)`);
        this.emit('sessionEnded', {
            sessionId: this.currentSession.id,
            duration,
            messageCount: this.messageCount
        });
        this.currentSession = null;
        this.sessionStartTime = null;
        this.lastActivityTime = null;
        this.messageCount = 0;
    }
    /**
     * タイマーを開始
     */
    startTimers() {
        this.startSaveTimer();
        this.startIdleTimer();
    }
    /**
     * タイマーを停止
     */
    stopTimers() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
    /**
     * 定期保存タイマーを開始
     */
    async startSaveTimer() {
        const config = await this.getConfig();
        this.saveTimer = setInterval(async () => {
            await this.checkSessionLimits();
        }, config.interval * 60 * 1000); // 分を秒に変換
    }
    /**
     * アイドルタイマーを開始
     */
    async startIdleTimer() {
        const config = await this.getConfig();
        this.idleTimer = setTimeout(async () => {
            console.log('アイドルタイムアウトによりセッションを終了します');
            await this.endCurrentSession();
            await this.createNewSession();
        }, config.idleTimeout * 60 * 1000); // 分を秒に変換
    }
    /**
     * アイドルタイマーをリセット
     */
    async resetIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        await this.startIdleTimer();
    }
    /**
     * セッション制限をチェック
     */
    async checkSessionLimits() {
        if (!this.currentSession || !this.sessionStartTime) {
            return;
        }
        const config = await this.getConfig();
        const sessionDuration = Math.round((new Date().getTime() - this.sessionStartTime.getTime()) / 60000);
        // 最大セッション時間をチェック
        if (sessionDuration >= config.maxSessionDuration) {
            console.log('最大セッション時間に達したため、新しいセッションを開始します');
            await this.endCurrentSession();
            await this.createNewSession();
        }
    }
    /**
     * 設定を取得
     */
    async getConfig() {
        const config = await this.configService.loadConfig();
        return {
            enabled: config.autoSave?.enabled ?? false,
            interval: config.autoSave?.interval ?? 5,
            idleTimeout: config.autoSave?.idleTimeout ?? 30,
            maxSessionDuration: config.autoSave?.maxSessionDuration ?? 120,
            watchDirectories: config.autoSave?.watchDirectories ?? [],
            filePatterns: config.autoSave?.filePatterns ?? ['*.md', '*.txt', '*.js', '*.ts']
        };
    }
    /**
     * 設定を更新
     */
    async updateConfig(newConfig) {
        const currentConfig = await this.configService.loadConfig();
        const updatedConfig = {
            ...currentConfig,
            autoSave: {
                ...await this.getConfig(),
                ...newConfig
            }
        };
        await this.configService.saveConfig(updatedConfig);
        // 実行中の場合はタイマーを再起動
        if (this.saveTimer || this.idleTimer) {
            this.stopTimers();
            this.startTimers();
        }
    }
    /**
     * 現在の状態を取得
     */
    getStatus() {
        const sessionDuration = this.sessionStartTime
            ? Math.round((new Date().getTime() - this.sessionStartTime.getTime()) / 60000)
            : 0;
        return {
            isActive: this.currentSession !== null,
            currentSessionId: this.currentSession?.id || null,
            lastSaveTime: this.lastActivityTime,
            messageCount: this.messageCount,
            sessionDuration
        };
    }
    /**
     * 現在のセッションを取得
     */
    getCurrentSession() {
        return this.currentSession;
    }
}
exports.AutoSaveService = AutoSaveService;
//# sourceMappingURL=AutoSaveService.js.map