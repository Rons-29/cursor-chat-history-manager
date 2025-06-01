import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { ChatHistoryService } from './services/ChatHistoryService.js';
import { AutoSaveService } from './services/AutoSaveService.js';
import { ExportService } from './services/ExportService.js';
import { ChatHistoryConfig } from './types/index.js';

export class CursorChatHistoryExtension {
  private chatHistoryService!: ChatHistoryService;
  private autoSaveService!: AutoSaveService;
  private exportService!: ExportService;
  private statusBarItem: vscode.StatusBarItem;
  private isInitialized = false;

  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'cursor-chat-history.showStatus';
    this.statusBarItem.show();
    this.updateStatusBar();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 設定を読み込み
      const config = this.getConfiguration();
      
      // サービスを初期化
      this.chatHistoryService = new ChatHistoryService(config);
      await this.chatHistoryService.initialize();
      
      this.autoSaveService = new AutoSaveService(this.chatHistoryService, config.autoSave);
      this.exportService = new ExportService(this.chatHistoryService);

      this.isInitialized = true;
      this.updateStatusBar();

      // 自動保存が有効な場合は開始
      if (config.autoSave?.enabled) {
        await this.autoSaveService.start();
        this.updateStatusBar();
      }

      vscode.window.showInformationMessage('Cursor Chat History Manager が初期化されました');
    } catch (error) {
      vscode.window.showErrorMessage(`初期化エラー: ${error}`);
    }
  }

  private getConfiguration(): ChatHistoryConfig {
    const config = vscode.workspace.getConfiguration('cursorChatHistory');
    
    return {
      storageType: 'file',
      storagePath: config.get('storage.path') || path.join(os.homedir(), '.cursor-chat-history'),
      maxSessions: config.get('storage.maxSessions', 1000),
      maxMessagesPerSession: 500,
      autoCleanup: true,
      cleanupDays: 30,
      enableSearch: true,
      enableBackup: false,
      backupInterval: 24,
      autoSave: {
        enabled: config.get('autoSave.enabled', false),
        interval: config.get('autoSave.interval', 5),
        watchDirectories: [vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()],
        filePatterns: ['*.ts', '*.js', '*.tsx', '*.jsx', '*.py', '*.java', '*.cpp', '*.c', '*.html', '*.css', '*.scss', '*.md', '*.txt', '*.json'],
        maxSessionDuration: 120,
        idleTimeout: config.get('autoSave.idleTimeout', 30)
      }
    };
  }

  private updateStatusBar(): void {
    if (!this.isInitialized) {
      this.statusBarItem.text = '$(sync~spin) Chat History 初期化中...';
      this.statusBarItem.tooltip = 'Chat History Manager を初期化しています';
      return;
    }

    const status = this.autoSaveService?.getStatus();
    if (status?.running) {
      this.statusBarItem.text = `$(record) Chat History (${status.saveCount})`;
      this.statusBarItem.tooltip = `自動保存実行中 - 保存回数: ${status.saveCount}`;
    } else {
      this.statusBarItem.text = '$(circle-outline) Chat History';
      this.statusBarItem.tooltip = '自動保存停止中 - クリックして状態を確認';
    }
  }

  // コマンドハンドラー
  async startAutoSave(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.autoSaveService.start();
      this.updateStatusBar();
      vscode.window.showInformationMessage('自動保存を開始しました');
    } catch (error) {
      vscode.window.showErrorMessage(`自動保存開始エラー: ${error}`);
    }
  }

  async stopAutoSave(): Promise<void> {
    if (!this.autoSaveService) return;

    try {
      await this.autoSaveService.stop();
      this.updateStatusBar();
      vscode.window.showInformationMessage('自動保存を停止しました');
    } catch (error) {
      vscode.window.showErrorMessage(`自動保存停止エラー: ${error}`);
    }
  }

  async showStatus(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const status = this.autoSaveService.getStatus();
    const stats = await this.chatHistoryService.getStats();

    const message = [
      `🤖 自動保存: ${status.running ? '実行中' : '停止中'}`,
      `📊 総セッション数: ${stats.totalSessions}`,
      `💬 総メッセージ数: ${stats.totalMessages}`,
      `💾 ストレージサイズ: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      `🔄 保存回数: ${status.saveCount}`,
      status.currentSessionId ? `📝 現在のセッション: ${status.currentSessionId}` : ''
    ].filter(Boolean).join('\n');

    vscode.window.showInformationMessage(message, { modal: true });
  }

  async saveCurrentChat(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 現在のエディタからテキストを取得
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('アクティブなエディタがありません');
        return;
      }

      const content = editor.document.getText();
      if (!content.trim()) {
        vscode.window.showWarningMessage('保存するコンテンツがありません');
        return;
      }

      // セッションを作成
      const session = await this.chatHistoryService.createSession({
        title: `手動保存 - ${new Date().toLocaleString('ja-JP')}`,
        tags: ['manual-save', 'cursor'],
        project: vscode.workspace.name || 'unknown'
      });

      // メッセージを追加
      await this.chatHistoryService.addMessage(session.id, {
        role: 'user',
        content: content,
        metadata: {
          source: 'manual',
          fileName: editor.document.fileName,
          savedAt: new Date().toISOString()
        }
      });

      vscode.window.showInformationMessage(`チャットを保存しました (ID: ${session.id})`);
    } catch (error) {
      vscode.window.showErrorMessage(`保存エラー: ${error}`);
    }
  }

  async searchHistory(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const keyword = await vscode.window.showInputBox({
        prompt: '検索キーワードを入力してください',
        placeHolder: 'キーワード...'
      });

      if (!keyword) return;

      const sessions = await this.chatHistoryService.searchSessions({
        keyword,
        limit: 20
      });

      if (sessions.length === 0) {
        vscode.window.showInformationMessage('検索結果が見つかりませんでした');
        return;
      }

      // 検索結果を表示
      const items = sessions.map(session => ({
        label: session.title,
        description: `${session.messages.length}件のメッセージ`,
        detail: `作成: ${session.createdAt.toLocaleString('ja-JP')} | タグ: ${session.tags.join(', ')}`,
        session
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: '表示するセッションを選択してください'
      });

      if (selected) {
        await this.showSessionDetails(selected.session);
      }

    } catch (error) {
      vscode.window.showErrorMessage(`検索エラー: ${error}`);
    }
  }

  private async showSessionDetails(session: any): Promise<void> {
    const content = [
      `# ${session.title}`,
      '',
      `**作成日:** ${session.createdAt.toLocaleString('ja-JP')}`,
      `**更新日:** ${session.updatedAt.toLocaleString('ja-JP')}`,
      `**タグ:** ${session.tags.join(', ')}`,
      `**メッセージ数:** ${session.messages.length}`,
      '',
      '## メッセージ',
      ''
    ];

    for (const message of session.messages) {
      content.push(`### ${message.role === 'user' ? 'ユーザー' : 'アシスタント'}`);
      content.push(`**時刻:** ${message.timestamp.toLocaleString('ja-JP')}`);
      content.push('');
      content.push(message.content);
      content.push('');
      content.push('---');
      content.push('');
    }

    const document = await vscode.workspace.openTextDocument({
      content: content.join('\n'),
      language: 'markdown'
    });

    await vscode.window.showTextDocument(document);
  }

  async exportHistory(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // エクスポート形式を選択
      const format = await vscode.window.showQuickPick([
        { label: 'JSON', value: 'json', description: 'JSON形式でエクスポート' },
        { label: 'Markdown', value: 'markdown', description: 'Markdown形式でエクスポート' },
        { label: 'Text', value: 'txt', description: 'テキスト形式でエクスポート' }
      ], {
        placeHolder: 'エクスポート形式を選択してください'
      });

      if (!format) return;

      // 保存先を選択
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`chat-history.${format.value}`),
        filters: {
          'All Files': ['*']
        }
      });

      if (!uri) return;

      // 全セッションを取得
      const sessions = await this.chatHistoryService.searchSessions({ limit: 1000 });
      
      await this.exportService.exportSessions(sessions, uri.fsPath, format.value as any);

      vscode.window.showInformationMessage(`履歴をエクスポートしました: ${uri.fsPath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`エクスポートエラー: ${error}`);
    }
  }

  async openSettings(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'cursorChatHistory');
  }

  dispose(): void {
    this.statusBarItem.dispose();
    if (this.autoSaveService) {
      this.autoSaveService.stop();
    }
  }
}

let extension: CursorChatHistoryExtension;

export function activate(context: vscode.ExtensionContext) {
  extension = new CursorChatHistoryExtension(context);

  // コマンドを登録
  const commands = [
    vscode.commands.registerCommand('cursor-chat-history.startAutoSave', () => extension.startAutoSave()),
    vscode.commands.registerCommand('cursor-chat-history.stopAutoSave', () => extension.stopAutoSave()),
    vscode.commands.registerCommand('cursor-chat-history.showStatus', () => extension.showStatus()),
    vscode.commands.registerCommand('cursor-chat-history.saveCurrentChat', () => extension.saveCurrentChat()),
    vscode.commands.registerCommand('cursor-chat-history.searchHistory', () => extension.searchHistory()),
    vscode.commands.registerCommand('cursor-chat-history.exportHistory', () => extension.exportHistory()),
    vscode.commands.registerCommand('cursor-chat-history.openSettings', () => extension.openSettings())
  ];

  commands.forEach(command => context.subscriptions.push(command));
  context.subscriptions.push(extension);
}

export function deactivate() {
  if (extension) {
    extension.dispose();
  }
} 