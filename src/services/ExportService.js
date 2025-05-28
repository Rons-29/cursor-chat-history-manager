"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const date_fns_1 = require("date-fns");
class ExportService {
    /**
     * セッションをエクスポート
     */
    async exportSessions(sessions, options) {
        await fs_extra_1.default.ensureDir(path_1.default.dirname(options.outputPath));
        switch (options.format) {
            case 'json':
                await this.exportAsJson(sessions, options);
                break;
            case 'markdown':
                await this.exportAsMarkdown(sessions, options);
                break;
            case 'txt':
                await this.exportAsText(sessions, options);
                break;
            default:
                throw new Error(`サポートされていないフォーマット: ${options.format}`);
        }
    }
    /**
     * JSON形式でエクスポート
     */
    async exportAsJson(sessions, options) {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalSessions: sessions.length,
            totalMessages: sessions.reduce((sum, session) => sum + session.messages.length, 0),
            sessions: options.includeMetadata ? sessions : sessions.map(session => ({
                id: session.id,
                title: session.title,
                startTime: session.startTime,
                endTime: session.endTime,
                messages: session.messages
            }))
        };
        await fs_extra_1.default.writeJson(options.outputPath, exportData, { spaces: 2 });
    }
    /**
     * Markdown形式でエクスポート
     */
    async exportAsMarkdown(sessions, options) {
        let markdown = '# Cursor Chat履歴\n\n';
        markdown += `エクスポート日時: ${(0, date_fns_1.format)(new Date(), 'yyyy年MM月dd日 HH:mm:ss')}\n`;
        markdown += `総セッション数: ${sessions.length}\n`;
        markdown += `総メッセージ数: ${sessions.reduce((sum, session) => sum + session.messages.length, 0)}\n\n`;
        for (const session of sessions) {
            markdown += `## ${session.title || 'セッション'}\n\n`;
            markdown += `- **セッションID**: ${session.id}\n`;
            markdown += `- **開始時刻**: ${(0, date_fns_1.format)(session.startTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`;
            if (session.endTime) {
                markdown += `- **終了時刻**: ${(0, date_fns_1.format)(session.endTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`;
            }
            if (session.metadata?.tags && session.metadata.tags.length > 0) {
                markdown += `- **タグ**: ${session.metadata.tags.join(', ')}\n`;
            }
            markdown += `- **メッセージ数**: ${session.messages.length}\n\n`;
            if (session.messages.length > 0) {
                markdown += '### 会話内容\n\n';
                for (const [index, message] of session.messages.entries()) {
                    const roleIcon = this.getRoleIcon(message.role);
                    const timestamp = (0, date_fns_1.format)(message.timestamp, 'HH:mm:ss');
                    markdown += `#### ${index + 1}. ${roleIcon} ${message.role.toUpperCase()} (${timestamp})\n\n`;
                    markdown += `${message.content}\n\n`;
                }
            }
            markdown += '---\n\n';
        }
        await fs_extra_1.default.writeFile(options.outputPath, markdown, 'utf-8');
    }
    /**
     * テキスト形式でエクスポート
     */
    async exportAsText(sessions, options) {
        let text = 'Cursor Chat履歴\n';
        text += '='.repeat(50) + '\n\n';
        text += `エクスポート日時: ${(0, date_fns_1.format)(new Date(), 'yyyy年MM月dd日 HH:mm:ss')}\n`;
        text += `総セッション数: ${sessions.length}\n`;
        text += `総メッセージ数: ${sessions.reduce((sum, session) => sum + session.messages.length, 0)}\n\n`;
        for (const [sessionIndex, session] of sessions.entries()) {
            text += `${sessionIndex + 1}. ${session.title || 'セッション'}\n`;
            text += '-'.repeat(30) + '\n';
            text += `セッションID: ${session.id}\n`;
            text += `開始時刻: ${(0, date_fns_1.format)(session.startTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`;
            if (session.endTime) {
                text += `終了時刻: ${(0, date_fns_1.format)(session.endTime, 'yyyy年MM月dd日 HH:mm:ss')}\n`;
            }
            if (session.metadata?.tags && session.metadata.tags.length > 0) {
                text += `タグ: ${session.metadata.tags.join(', ')}\n`;
            }
            text += `メッセージ数: ${session.messages.length}\n\n`;
            if (session.messages.length > 0) {
                text += '会話内容:\n';
                for (const [index, message] of session.messages.entries()) {
                    const timestamp = (0, date_fns_1.format)(message.timestamp, 'HH:mm:ss');
                    text += `  ${index + 1}. [${message.role.toUpperCase()}] ${timestamp}\n`;
                    text += `     ${message.content.replace(/\n/g, '\n     ')}\n\n`;
                }
            }
            text += '\n' + '='.repeat(50) + '\n\n';
        }
        await fs_extra_1.default.writeFile(options.outputPath, text, 'utf-8');
    }
    /**
     * ロールに対応するアイコンを取得
     */
    getRoleIcon(role) {
        switch (role) {
            case 'user':
                return '👤';
            case 'assistant':
                return '🤖';
            case 'system':
                return '⚙️';
            default:
                return '❓';
        }
    }
    /**
     * 単一セッションをエクスポート
     */
    async exportSession(session, options) {
        await this.exportSessions([session], options);
    }
}
exports.ExportService = ExportService;
//# sourceMappingURL=ExportService.js.map