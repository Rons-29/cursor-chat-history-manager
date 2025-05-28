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
exports.ExportService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class ExportService {
    constructor(chatHistoryService) {
        this.chatHistoryService = chatHistoryService;
    }
    async exportSessions(sessions, outputPath, format) {
        await fs.ensureDir(path.dirname(outputPath));
        switch (format) {
            case 'json':
                await this.exportAsJSON(sessions, outputPath);
                break;
            case 'markdown':
                await this.exportAsMarkdown(sessions, outputPath);
                break;
            case 'txt':
                await this.exportAsText(sessions, outputPath);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    async exportAsJSON(sessions, outputPath) {
        const data = {
            exportedAt: new Date().toISOString(),
            totalSessions: sessions.length,
            sessions: sessions
        };
        await fs.writeJSON(outputPath, data, { spaces: 2 });
    }
    async exportAsMarkdown(sessions, outputPath) {
        let content = `# Chat History Export\n\n`;
        content += `**エクスポート日時:** ${new Date().toLocaleString('ja-JP')}\n`;
        content += `**総セッション数:** ${sessions.length}\n\n`;
        for (const session of sessions) {
            content += `## ${session.title}\n\n`;
            content += `**作成日:** ${session.createdAt.toLocaleString('ja-JP')}\n`;
            content += `**更新日:** ${session.updatedAt.toLocaleString('ja-JP')}\n`;
            content += `**タグ:** ${session.tags.join(', ')}\n`;
            if (session.metadata?.project) {
                content += `**プロジェクト:** ${session.metadata.project}\n`;
            }
            content += `**メッセージ数:** ${session.messages.length}\n\n`;
            for (const message of session.messages) {
                content += `### ${message.role === 'user' ? 'ユーザー' : 'アシスタント'}\n`;
                content += `**時刻:** ${message.timestamp.toLocaleString('ja-JP')}\n\n`;
                content += `${message.content}\n\n`;
                if (message.metadata?.fileName) {
                    content += `*ファイル: ${message.metadata.fileName}*\n\n`;
                }
            }
            content += `---\n\n`;
        }
        await fs.writeFile(outputPath, content, 'utf-8');
    }
    async exportAsText(sessions, outputPath) {
        let content = `Chat History Export\n`;
        content += `==================\n\n`;
        content += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n`;
        content += `総セッション数: ${sessions.length}\n\n`;
        for (const session of sessions) {
            content += `${session.title}\n`;
            content += `${'='.repeat(session.title.length)}\n\n`;
            content += `作成日: ${session.createdAt.toLocaleString('ja-JP')}\n`;
            content += `更新日: ${session.updatedAt.toLocaleString('ja-JP')}\n`;
            content += `タグ: ${session.tags.join(', ')}\n`;
            if (session.metadata?.project) {
                content += `プロジェクト: ${session.metadata.project}\n`;
            }
            content += `メッセージ数: ${session.messages.length}\n\n`;
            for (const message of session.messages) {
                content += `[${message.role === 'user' ? 'ユーザー' : 'アシスタント'}] `;
                content += `${message.timestamp.toLocaleString('ja-JP')}\n`;
                content += `${'-'.repeat(50)}\n`;
                content += `${message.content}\n\n`;
                if (message.metadata?.fileName) {
                    content += `(ファイル: ${message.metadata.fileName})\n\n`;
                }
            }
            content += `\n${'='.repeat(80)}\n\n`;
        }
        await fs.writeFile(outputPath, content, 'utf-8');
    }
}
exports.ExportService = ExportService;
//# sourceMappingURL=ExportService.js.map