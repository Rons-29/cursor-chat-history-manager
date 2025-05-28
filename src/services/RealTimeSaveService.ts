import { ChatHistoryService } from './ChatHistoryService.js';
import { ConfigService } from './ConfigService.js';
import { AutoSaveService } from './AutoSaveService.js';
import { ChatSession, Message } from '../types/index.js';
import { EventEmitter } from 'events';

export interface RealTimeSaveConfig {
  enabled: boolean;
  captureInterval: number; // ミリ秒単位
  bufferSize: number; // バッファするメッセージ数
  autoFlushInterval: number; // 自動フラッシュ間隔（秒）
  sessionDetection: {
    enabled: boolean;
    newSessionKeywords: string[];
    endSessionKeywords: string[];
    idleTimeout: number; // 分単位
  };
}

export interface CapturedMessage {
  content: string;
  timestamp: Date;
  source: 'user' | 'assistant' | 'system';
  metadata?: {
    windowTitle?: string;
    activeFile?: string;
    cursorPosition?: { line: number; column: number };
    selection?: string;
  };
}

export interface SessionDetectionResult {
  isNewSession: boolean;
  isEndSession: boolean;
  suggestedTitle?: string;
  confidence: number;
}

export class RealTimeSaveService extends EventEmitter {
  private chatHistoryService: ChatHistoryService;
  private configService: ConfigService;
  private autoSaveService: AutoSaveService;
  private isRunning: boolean = false;
  private captureInterval: NodeJS.Timeout | null = null;
  private flushInterval: NodeJS.Timeout | null = null;
  private messageBuffer: CapturedMessage[] = [];
  private currentSessionId: string | null = null;
  private lastActivityTime: Date = new Date();
  private captureCount: number = 0;

  constructor(
    chatHistoryService: ChatHistoryService,
    configService: ConfigService,
    autoSaveService: AutoSaveService
  ) {
    super();
    this.chatHistoryService = chatHistoryService;
    this.configService = configService;
    this.autoSaveService = autoSaveService;
  }

  /**
   * リアルタイム保存を開始
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('リアルタイム保存は既に実行中です');
      return;
    }

    const config = await this.configService.loadConfig();
    const realTimeConfig = this.getDefaultConfig();

    this.isRunning = true;
    console.log('リアルタイム保存を開始しています...');

    // 新しいセッションを作成
    await this.createNewSession();

    // キャプチャを開始
    this.startCapture(realTimeConfig);

    // 自動フラッシュを開始
    this.startAutoFlush(realTimeConfig);

    this.emit('started');
    console.log('リアルタイム保存が開始されました');
  }

  /**
   * リアルタイム保存を停止
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('リアルタイム保存は実行されていません');
      return;
    }

    this.isRunning = false;

    // キャプチャを停止
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    // 自動フラッシュを停止
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // バッファをフラッシュ
    await this.flushBuffer();

    // セッションを終了
    if (this.currentSessionId) {
      await this.chatHistoryService.updateSession(this.currentSessionId, {
        endTime: new Date()
      });
    }

    this.emit('stopped');
    console.log('リアルタイム保存を停止しました');
  }

  /**
   * メッセージを手動でキャプチャ
   */
  async captureMessage(content: string, source: 'user' | 'assistant' | 'system', metadata?: any): Promise<void> {
    const message: CapturedMessage = {
      content,
      timestamp: new Date(),
      source,
      metadata
    };

    this.messageBuffer.push(message);
    this.lastActivityTime = new Date();
    this.captureCount++;

    // セッション検出
    const detection = await this.detectSessionChange(content);
    if (detection.isNewSession) {
      await this.handleNewSession(detection.suggestedTitle);
    } else if (detection.isEndSession) {
      await this.handleEndSession();
    }

    // バッファサイズチェック
    const config = this.getDefaultConfig();
    if (this.messageBuffer.length >= config.bufferSize) {
      await this.flushBuffer();
    }

    this.emit('messageCaptured', message);
  }

  /**
   * キャプチャを開始
   */
  private startCapture(config: RealTimeSaveConfig): void {
    this.captureInterval = setInterval(async () => {
      try {
        // ここでCursorのチャット内容をキャプチャする
        // 実際の実装では、Cursor APIやDOM操作が必要
        const capturedContent = await this.captureCurrentChatContent();
        
        if (capturedContent) {
          await this.captureMessage(capturedContent.content, capturedContent.source, capturedContent.metadata);
        }
      } catch (error) {
        console.error('キャプチャエラー:', error);
      }
    }, config.captureInterval);
  }

  /**
   * 自動フラッシュを開始
   */
  private startAutoFlush(config: RealTimeSaveConfig): void {
    this.flushInterval = setInterval(async () => {
      if (this.messageBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, config.autoFlushInterval * 1000);
  }

  /**
   * 現在のチャット内容をキャプチャ（プレースホルダー実装）
   */
  private async captureCurrentChatContent(): Promise<CapturedMessage | null> {
    // 実際の実装では、以下のような方法でCursorのチャット内容を取得する：
    // 1. Cursor APIを使用
    // 2. DOM操作でチャット要素を取得
    // 3. ファイルシステム監視
    // 4. クリップボード監視
    
    // プレースホルダー実装
    return null;
  }

  /**
   * バッファをフラッシュ
   */
  private async flushBuffer(): Promise<void> {
    if (this.messageBuffer.length === 0 || !this.currentSessionId) {
      return;
    }

    try {
      for (const message of this.messageBuffer) {
        const chatMessage: Omit<Message, 'id' | 'timestamp'> = {
          role: message.source,
          content: message.content,
          metadata: {
            sessionId: this.currentSessionId,
            tags: ['realtime', 'auto-capture']
          }
        };

        await this.chatHistoryService.addMessage(this.currentSessionId, chatMessage);
      }

      this.emit('bufferFlushed', this.messageBuffer.length);
      this.messageBuffer = [];
    } catch (error) {
      console.error('バッファフラッシュエラー:', error);
      this.emit('error', error);
    }
  }

  /**
   * 新しいセッションを作成
   */
  private async createNewSession(title?: string): Promise<void> {
    const sessionTitle = title || `リアルタイムセッション - ${new Date().toLocaleString('ja-JP')}`;
    
    const session = await this.chatHistoryService.createSession(
      sessionTitle,
      {
        tags: ['realtime', 'auto-capture'],
        projectId: undefined,
        userId: undefined,
        summary: 'cursor-realtime'
      }
    );
    this.currentSessionId = session.id;

    this.emit('sessionCreated', this.currentSessionId);
  }

  /**
   * セッション変更を検出
   */
  private async detectSessionChange(content: string): Promise<SessionDetectionResult> {
    const config = this.getDefaultConfig();
    
    if (!config.sessionDetection.enabled) {
      return { isNewSession: false, isEndSession: false, confidence: 0 };
    }

    const lowerContent = content.toLowerCase();
    
    // 新しいセッションのキーワードをチェック
    const newSessionKeywords = config.sessionDetection.newSessionKeywords;
    const isNewSession = newSessionKeywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );

    // セッション終了のキーワードをチェック
    const endSessionKeywords = config.sessionDetection.endSessionKeywords;
    const isEndSession = endSessionKeywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );

    // タイトルを推測
    let suggestedTitle: string | undefined;
    if (isNewSession) {
      suggestedTitle = this.extractTitleFromContent(content);
    }

    return {
      isNewSession,
      isEndSession,
      suggestedTitle,
      confidence: isNewSession || isEndSession ? 0.8 : 0
    };
  }

  /**
   * コンテンツからタイトルを抽出
   */
  private extractTitleFromContent(content: string): string {
    // 最初の行または最初の文を取得
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // 長すぎる場合は切り詰める
      return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
    }
    return `新しいセッション - ${new Date().toLocaleString('ja-JP')}`;
  }

  /**
   * 新しいセッションを処理
   */
  private async handleNewSession(title?: string): Promise<void> {
    // 現在のセッションを終了
    if (this.currentSessionId) {
      await this.flushBuffer();
      await this.chatHistoryService.updateSession(this.currentSessionId, {
        endTime: new Date()
      });
    }

    // 新しいセッションを作成
    await this.createNewSession(title);
  }

  /**
   * セッション終了を処理
   */
  private async handleEndSession(): Promise<void> {
    if (this.currentSessionId) {
      await this.flushBuffer();
      await this.chatHistoryService.updateSession(this.currentSessionId, {
        endTime: new Date()
      });
      this.currentSessionId = null;
      this.emit('sessionEnded');
    }
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfig(): RealTimeSaveConfig {
    return {
      enabled: true,
      captureInterval: 1000, // 1秒
      bufferSize: 10,
      autoFlushInterval: 30, // 30秒
      sessionDetection: {
        enabled: true,
        newSessionKeywords: [
          '新しい質問',
          'new question',
          '別の件',
          'different topic',
          '次の質問',
          'next question'
        ],
        endSessionKeywords: [
          'ありがとう',
          'thank you',
          '終了',
          'end',
          '完了',
          'done',
          'finished'
        ],
        idleTimeout: 30
      }
    };
  }

  /**
   * 状態を取得
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentSessionId: this.currentSessionId,
      bufferSize: this.messageBuffer.length,
      captureCount: this.captureCount,
      lastActivityTime: this.lastActivityTime
    };
  }

  /**
   * 統計を取得
   */
  getStats() {
    return {
      totalCaptured: this.captureCount,
      bufferSize: this.messageBuffer.length,
      isActive: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.lastActivityTime.getTime() : 0
    };
  }
} 