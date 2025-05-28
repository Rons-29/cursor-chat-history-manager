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
exports.AutoSaveService = void 0;
const vscode = __importStar(require("vscode"));
class AutoSaveService {
    constructor(chatHistoryService, config) {
        this.isRunning = false;
        this.saveCount = 0;
        this.chatHistoryService = chatHistoryService;
        this.config = config;
    }
    async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.startAutoSave();
    }
    async stop() {
        this.isRunning = false;
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
        }
    }
    getStatus() {
        return {
            enabled: this.config.enabled,
            running: this.isRunning,
            saveCount: this.saveCount,
            currentSessionId: this.currentSessionId,
            lastSaveTime: this.lastSaveTime
        };
    }
    startAutoSave() {
        if (!this.isRunning)
            return;
        this.saveTimer = setTimeout(async () => {
            try {
                await this.performAutoSave();
            }
            catch (error) {
                console.error('Auto save error:', error);
            }
            // 次の保存をスケジュール
            this.startAutoSave();
        }, this.config.interval * 60 * 1000); // 分を秒に変換
    }
    async performAutoSave() {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const document = editor.document;
        if (document.isUntitled || !document.isDirty)
            return;
        // 監視対象のファイルパターンかチェック
        const fileName = document.fileName;
        const isWatchedFile = this.config.filePatterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(fileName);
        });
        if (!isWatchedFile)
            return;
        try {
            // 新しいセッションを作成するか、既存のセッションを使用
            if (!this.currentSessionId) {
                const session = await this.chatHistoryService.createSession({
                    title: `自動保存 - ${new Date().toLocaleString('ja-JP')}`,
                    tags: ['auto-save', 'cursor'],
                    project: vscode.workspace.name || 'unknown'
                });
                this.currentSessionId = session.id;
            }
            // メッセージを追加
            await this.chatHistoryService.addMessage(this.currentSessionId, {
                role: 'user',
                content: document.getText(),
                metadata: {
                    source: 'auto-save',
                    fileName: document.fileName,
                    savedAt: new Date().toISOString()
                }
            });
            this.saveCount++;
            this.lastSaveTime = new Date();
        }
        catch (error) {
            console.error('Failed to perform auto save:', error);
        }
    }
}
exports.AutoSaveService = AutoSaveService;
//# sourceMappingURL=AutoSaveService.js.map