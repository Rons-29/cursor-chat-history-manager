import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, ChatMessage, ChatHistoryConfig, SessionStats } from '../types';

export class ChatHistoryService {
  private sessions: Map<string, ChatSession> = new Map();
  private config: ChatHistoryConfig;
  private dataPath: string;

  constructor(config: ChatHistoryConfig) {
    this.config = config;
    this.dataPath = path.join(config.storagePath, 'sessions.json');
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.config.storagePath);
    await this.loadSessions();
  }

  async createSession(options: {
    title: string;
    tags?: string[];
    project?: string;
  }): Promise<ChatSession> {
    const session: ChatSession = {
      id: uuidv4(),
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

  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const newMessage: ChatMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      ...message
    };

    session.messages.push(newMessage);
    session.updatedAt = new Date();
    await this.saveSessions();
  }

  async searchSessions(options: {
    keyword?: string;
    tags?: string[];
    limit?: number;
  }): Promise<ChatSession[]> {
    let results = Array.from(this.sessions.values());

    if (options.keyword) {
      const keyword = options.keyword.toLowerCase();
      results = results.filter(session => 
        session.title.toLowerCase().includes(keyword) ||
        session.messages.some(msg => msg.content.toLowerCase().includes(keyword))
      );
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(session =>
        options.tags!.some(tag => session.tags.includes(tag))
      );
    }

    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getStats(): Promise<SessionStats> {
    const sessions = Array.from(this.sessions.values());
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    
    let storageSize = 0;
    try {
      const stats = await fs.stat(this.dataPath);
      storageSize = stats.size;
    } catch (error) {
      // ファイルが存在しない場合は0
    }

    return {
      totalSessions: sessions.length,
      totalMessages,
      storageSize
    };
  }

  private async loadSessions(): Promise<void> {
    try {
      if (await fs.pathExists(this.dataPath)) {
        const data = await fs.readJSON(this.dataPath);
        this.sessions.clear();
        
        for (const sessionData of data.sessions || []) {
          // 日付文字列をDateオブジェクトに変換
          sessionData.createdAt = new Date(sessionData.createdAt);
          sessionData.updatedAt = new Date(sessionData.updatedAt);
          sessionData.messages.forEach((msg: any) => {
            msg.timestamp = new Date(msg.timestamp);
          });
          
          this.sessions.set(sessionData.id, sessionData);
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  private async saveSessions(): Promise<void> {
    try {
      const data = {
        sessions: Array.from(this.sessions.values()),
        savedAt: new Date().toISOString()
      };
      
      await fs.writeJSON(this.dataPath, data, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save sessions:', error);
      throw error;
    }
  }
} 