import * as fs from 'fs-extra';
import * as path from 'path';
import { ChatHistoryService } from './ChatHistoryService';
import { ChatSession } from '../types';

export class ExportService {
  private chatHistoryService: ChatHistoryService;

  constructor(chatHistoryService: ChatHistoryService) {
    this.chatHistoryService = chatHistoryService;
  }

  async exportSessions(
    sessions: ChatSession[],
    outputPath: string,
    format: 'json' | 'markdown' | 'txt'
  ): Promise<void> {
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

  private async exportAsJSON(sessions: ChatSession[], outputPath: string): Promise<void> {
    const data = {
      exportedAt: new Date().toISOString(),
      totalSessions: sessions.length,
      sessions: sessions
    };

    await fs.writeJSON(outputPath, data, { spaces: 2 });
  }

  private async exportAsMarkdown(sessions: ChatSession[], outputPath: string): Promise<void> {
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

  private async exportAsText(sessions: ChatSession[], outputPath: string): Promise<void> {
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