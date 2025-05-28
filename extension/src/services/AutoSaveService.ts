import * as vscode from 'vscode';
import { ChatHistoryService } from './ChatHistoryService';
import { AutoSaveStatus, AutoSaveConfig } from '../types';

export class AutoSaveService {
  private chatHistoryService: ChatHistoryService;
  private config: AutoSaveConfig;
  private isRunning = false;
  private saveCount = 0;
  private currentSessionId?: string;
  private lastSaveTime?: Date;
  private saveTimer?: NodeJS.Timeout;

  constructor(chatHistoryService: ChatHistoryService, config: AutoSaveConfig) {
    this.chatHistoryService = chatHistoryService;
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startAutoSave();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  getStatus(): AutoSaveStatus {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      saveCount: this.saveCount,
      currentSessionId: this.currentSessionId,
      lastSaveTime: this.lastSaveTime
    };
  }

  private startAutoSave(): void {
    if (!this.isRunning) return;

    this.saveTimer = setTimeout(async () => {
      try {
        await this.performAutoSave();
      } catch (error) {
        console.error('Auto save error:', error);
      }
      
      // 次の保存をスケジュール
      this.startAutoSave();
    }, this.config.interval * 60 * 1000); // 分を秒に変換
  }

  private async performAutoSave(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    if (document.isUntitled || !document.isDirty) return;

    // 監視対象のファイルパターンかチェック
    const fileName = document.fileName;
    const isWatchedFile = this.config.filePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(fileName);
    });

    if (!isWatchedFile) return;

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

    } catch (error) {
      console.error('Failed to perform auto save:', error);
    }
  }
} 