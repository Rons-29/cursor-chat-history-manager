#!/usr/bin/env ts-node

/**
 * Claude Dev拡張機能データ統合スクリプト
 * 
 * このスクリプトは、Claude Dev拡張機能の会話履歴を
 * Chat History ManagerのSQLiteデータベースに統合します。
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import { createHash } from 'crypto';

// 型定義
interface ClaudeDevMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    image_url?: string;
  }>;
}

interface ClaudeDevTask {
  taskId: string;
  timestamp: Date;
  conversations: ClaudeDevMessage[];
  metadata?: {
    project?: string;
    description?: string;
  };
}

interface IntegratedSession {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  metadata: {
    source: 'claude-dev';
    taskId: string;
    originalTimestamp: string;
    messageCount: number;
    hasAssistantResponses: boolean;
  };
}

class ClaudeDevIntegrator {
  private db: Database.Database;
  private claudeDevPath: string;

  constructor() {
    // SQLiteデータベースの初期化
    const dbPath = path.join(process.cwd(), 'data', 'chat-history.db');
    this.db = new Database(dbPath);
    
    // Claude Dev拡張機能のパス
    this.claudeDevPath = path.join(
      os.homedir(),
      'Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/tasks'
    );
    
    this.initializeDatabase();
  }

  /**
   * データベースの初期化
   */
  private initializeDatabase(): void {
    // セッションテーブルの作成（存在しない場合）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT
      )
    `);

    // FTS5全文検索テーブルの作成
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
        id, title, content,
        content='sessions',
        content_rowid='rowid'
      )
    `);

    console.log('✅ データベースの初期化が完了しました');
  }

  /**
   * Claude Devタスクの検索
   */
  async findClaudeDevTasks(): Promise<string[]> {
    try {
      if (!await fs.pathExists(this.claudeDevPath)) {
        console.log('❌ Claude Dev拡張機能のデータが見つかりません');
        return [];
      }

      const tasks = await fs.readdir(this.claudeDevPath);
      const validTasks = [];

      for (const task of tasks) {
        const taskPath = path.join(this.claudeDevPath, task);
        const historyFile = path.join(taskPath, 'api_conversation_history.json');
        
        if (await fs.pathExists(historyFile)) {
          validTasks.push(task);
        }
      }

      console.log(`📁 ${validTasks.length}個のClaude Devタスクを発見しました`);
      return validTasks;
    } catch (error) {
      console.error('❌ タスク検索エラー:', error);
      return [];
    }
  }

  /**
   * 単一タスクの会話履歴を読み込み
   */
  async loadTaskConversations(taskId: string): Promise<ClaudeDevTask | null> {
    try {
      const taskPath = path.join(this.claudeDevPath, taskId);
      const historyFile = path.join(taskPath, 'api_conversation_history.json');

      if (!await fs.pathExists(historyFile)) {
        return null;
      }

      const conversations: ClaudeDevMessage[] = await fs.readJson(historyFile);
      const timestamp = new Date(parseInt(taskId));

      return {
        taskId,
        timestamp,
        conversations,
        metadata: {
          project: 'unknown',
          description: `Claude Dev Task ${taskId}`
        }
      };
    } catch (error) {
      console.error(`❌ タスク ${taskId} の読み込みエラー:`, error);
      return null;
    }
  }

  /**
   * Claude Devタスクを統合セッションに変換
   */
  convertToIntegratedSession(task: ClaudeDevTask): IntegratedSession {
    // 会話内容を結合
    const content = task.conversations.map(msg => {
      const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント';
      const text = msg.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      
      return `[${role}]\n${text}`;
    }).join('\n\n---\n\n');

    // タイトルの生成（最初のユーザーメッセージから）
    const firstUserMessage = task.conversations.find(msg => msg.role === 'user');
    const title = firstUserMessage?.content
      .find(c => c.type === 'text')?.text
      ?.substring(0, 100)
      ?.replace(/\n/g, ' ') || `Claude Dev Task ${task.taskId}`;

    // セッションIDの生成
    const sessionId = `claude-dev-${task.taskId}`;

    // アシスタントの返答があるかチェック
    const hasAssistantResponses = task.conversations.some(msg => msg.role === 'assistant');

    return {
      id: sessionId,
      title: title,
      content: content,
      timestamp: task.timestamp.getTime(),
      metadata: {
        source: 'claude-dev',
        taskId: task.taskId,
        originalTimestamp: task.timestamp.toISOString(),
        messageCount: task.conversations.length,
        hasAssistantResponses
      }
    };
  }

  /**
   * セッションをデータベースに保存
   */
  saveSession(session: IntegratedSession): boolean {
    try {
      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO sessions (id, title, content, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        session.id,
        session.title,
        session.content,
        session.timestamp,
        JSON.stringify(session.metadata)
      );

      // FTS5インデックスの更新
      const ftsStmt = this.db.prepare(`
        INSERT OR REPLACE INTO sessions_fts (id, title, content)
        VALUES (?, ?, ?)
      `);

      ftsStmt.run(session.id, session.title, session.content);

      return true;
    } catch (error) {
      console.error(`❌ セッション ${session.id} の保存エラー:`, error);
      return false;
    }
  }

  /**
   * 統計情報の表示
   */
  showStatistics(): void {
    const totalSessions = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
    const claudeDevSessions = this.db.prepare(`
      SELECT COUNT(*) as count FROM sessions 
      WHERE json_extract(metadata, '$.source') = 'claude-dev'
    `).get() as { count: number };

    const withAssistantResponses = this.db.prepare(`
      SELECT COUNT(*) as count FROM sessions 
      WHERE json_extract(metadata, '$.source') = 'claude-dev'
      AND json_extract(metadata, '$.hasAssistantResponses') = 1
    `).get() as { count: number };

    console.log('\n📊 統計情報:');
    console.log(`   総セッション数: ${totalSessions.count}`);
    console.log(`   Claude Devセッション数: ${claudeDevSessions.count}`);
    console.log(`   AI返答を含むセッション数: ${withAssistantResponses.count}`);
  }

  /**
   * メイン統合処理
   */
  async integrate(): Promise<void> {
    console.log('🚀 Claude Dev拡張機能データの統合を開始します...\n');

    // タスクの検索
    const taskIds = await this.findClaudeDevTasks();
    if (taskIds.length === 0) {
      console.log('❌ 統合可能なタスクが見つかりませんでした');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // 各タスクの処理
    for (const taskId of taskIds) {
      console.log(`📝 処理中: ${taskId}`);

      const task = await this.loadTaskConversations(taskId);
      if (!task) {
        errorCount++;
        continue;
      }

      const session = this.convertToIntegratedSession(task);
      const success = this.saveSession(session);

      if (success) {
        successCount++;
        console.log(`   ✅ 統合完了 (${task.conversations.length}メッセージ)`);
      } else {
        errorCount++;
        console.log(`   ❌ 統合失敗`);
      }
    }

    console.log(`\n🎉 統合処理が完了しました!`);
    console.log(`   成功: ${successCount}件`);
    console.log(`   失敗: ${errorCount}件`);

    this.showStatistics();
  }

  /**
   * リソースのクリーンアップ
   */
  close(): void {
    this.db.close();
  }
}

// メイン実行
async function main() {
  const integrator = new ClaudeDevIntegrator();

  try {
    await integrator.integrate();
  } catch (error) {
    console.error('❌ 統合処理でエラーが発生しました:', error);
  } finally {
    integrator.close();
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main().catch(console.error);
}

export { ClaudeDevIntegrator }; 