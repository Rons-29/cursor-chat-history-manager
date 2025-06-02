/**
 * セッションタイトル自動生成サービス
 * 無意味な「Cursor Prompt」から意味のあるタイトルを生成
 */
export class SessionTitleService {
  private readonly MAX_TITLE_LENGTH = 50
  private readonly SUMMARY_LENGTH = 100

  /**
   * メッセージ内容から意味のあるタイトルを生成
   */
  generateTitle(firstMessage: string): string {
    try {
      // 1. 基本的なクリーニング
      const cleaned = this.cleanMessage(firstMessage)

      // 2. キーワード抽出
      const keywords = this.extractKeywords(cleaned)

      // 3. タイトル生成
      const title = this.createTitleFromKeywords(keywords, cleaned)

      // 4. 長さ調整
      return this.truncateTitle(title)
    } catch (error) {
      console.warn('タイトル生成に失敗:', error)
      return this.generateFallbackTitle()
    }
  }

  /**
   * 複数メッセージから会話要約を生成
   */
  generateSummary(messages: Array<{ content: string; role: string }>): string {
    try {
      if (messages.length === 0) return '空のセッション'
      if (messages.length === 1) {
        return this.truncateText(messages[0].content, this.SUMMARY_LENGTH)
      }

      // 主要なメッセージを抽出
      const keyMessages = this.extractKeyMessages(messages)
      const topics = this.extractTopics(keyMessages)

      return this.createSummaryFromTopics(topics)
    } catch (error) {
      console.warn('要約生成に失敗:', error)
      return `${messages.length}件のメッセージを含む会話`
    }
  }

  /**
   * メッセージから主要トピックを抽出
   */
  extractTopics(messages: Array<{ content: string; role: string }>): string[] {
    const allText = messages.map(m => m.content).join(' ')
    const keywords = this.extractKeywords(allText)

    // 技術関連キーワードの重み付け
    const techKeywords = this.filterTechKeywords(keywords)
    const generalKeywords = keywords.filter(k => !techKeywords.includes(k))

    return [...techKeywords.slice(0, 3), ...generalKeywords.slice(0, 2)]
  }

  /**
   * メッセージの基本クリーニング
   */
  private cleanMessage(message: string): string {
    return message
      .replace(/\n+/g, ' ') // 改行を空白に
      .replace(/\s+/g, ' ') // 連続空白を単一空白に
      .replace(/[「」『』]/g, '') // 括弧を削除
      .trim()
  }

  /**
   * キーワード抽出（日本語対応）
   */
  private extractKeywords(text: string): string[] {
    // 基本的な単語分割（簡易版）
    const words = text
      .split(/[\s、。！？,.!?]+/)
      .filter(word => word.length >= 2)
      .filter(word => !this.isStopWord(word))
      .slice(0, 10)

    return [...new Set(words)] // 重複除去
  }

  /**
   * ストップワード判定
   */
  private isStopWord(word: string): boolean {
    const stopWords = [
      'これ',
      'それ',
      'あれ',
      'この',
      'その',
      'あの',
      'です',
      'ます',
      'である',
      'だった',
      'でした',
      'について',
      'に関して',
      'として',
      'という',
      'ですが',
      'ですか',
      'ですね',
      'ですよ',
    ]
    return stopWords.includes(word)
  }

  /**
   * キーワードからタイトル生成
   */
  private createTitleFromKeywords(
    keywords: string[],
    originalText: string
  ): string {
    if (keywords.length === 0) {
      return this.extractFirstSentence(originalText)
    }

    // パターンマッチング
    if (this.isQuestion(originalText)) {
      return this.createQuestionTitle(keywords, originalText)
    }

    if (this.isRequest(originalText)) {
      return this.createRequestTitle(keywords)
    }

    if (this.isProblem(originalText)) {
      return this.createProblemTitle(keywords)
    }

    // デフォルト: キーワードベースタイトル
    return this.createKeywordTitle(keywords)
  }

  /**
   * 質問形式の判定
   */
  private isQuestion(text: string): boolean {
    return /[？?]|ですか|でしょうか|どう|なぜ|何|いつ|どこ|誰/.test(text)
  }

  /**
   * 依頼形式の判定
   */
  private isRequest(text: string): boolean {
    return /してください|お願い|作って|教えて|手伝って|確認/.test(text)
  }

  /**
   * 問題報告の判定
   */
  private isProblem(text: string): boolean {
    return /エラー|問題|バグ|動かない|失敗|困って/.test(text)
  }

  /**
   * 質問タイトル生成
   */
  private createQuestionTitle(
    keywords: string[],
    originalText: string
  ): string {
    const mainKeyword = keywords[0] || '質問'
    if (originalText.includes('どう思う') || originalText.includes('意見')) {
      return `${mainKeyword}についての意見・相談`
    }
    return `${mainKeyword}について`
  }

  /**
   * 依頼タイトル生成
   */
  private createRequestTitle(keywords: string[]): string {
    const mainKeyword = keywords[0] || '作業'
    return `${mainKeyword}の依頼・相談`
  }

  /**
   * 問題タイトル生成
   */
  private createProblemTitle(keywords: string[]): string {
    const mainKeyword = keywords[0] || 'システム'
    return `${mainKeyword}の問題・トラブル`
  }

  /**
   * キーワードベースタイトル生成
   */
  private createKeywordTitle(keywords: string[]): string {
    if (keywords.length === 1) {
      return `${keywords[0]}について`
    }
    if (keywords.length >= 2) {
      return `${keywords[0]}と${keywords[1]}について`
    }
    return '一般的な相談'
  }

  /**
   * 最初の文を抽出
   */
  private extractFirstSentence(text: string): string {
    const sentences = text.split(/[。！？.!?]/)
    return sentences[0] || text.substring(0, 30)
  }

  /**
   * タイトル長さ調整
   */
  private truncateTitle(title: string): string {
    if (title.length <= this.MAX_TITLE_LENGTH) {
      return title
    }
    return title.substring(0, this.MAX_TITLE_LENGTH - 3) + '...'
  }

  /**
   * フォールバックタイトル生成
   */
  private generateFallbackTitle(): string {
    const now = new Date()
    return `チャット ${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
  }

  /**
   * 主要メッセージ抽出
   */
  private extractKeyMessages(
    messages: Array<{ content: string; role: string }>
  ): Array<{ content: string; role: string }> {
    // 長いメッセージや質問を優先
    return messages
      .filter(m => m.content.length > 10)
      .sort((a, b) => {
        const aScore = this.calculateMessageImportance(a.content)
        const bScore = this.calculateMessageImportance(b.content)
        return bScore - aScore
      })
      .slice(0, 5)
  }

  /**
   * メッセージ重要度計算
   */
  private calculateMessageImportance(content: string): number {
    let score = content.length * 0.1 // 基本スコア

    // 質問形式は重要度高
    if (this.isQuestion(content)) score += 10

    // 技術用語が含まれる場合は重要度高
    if (this.containsTechTerms(content)) score += 5

    // 具体的な内容（数字、ファイル名等）
    if (/\d+|\.js|\.ts|\.py|\.md/.test(content)) score += 3

    return score
  }

  /**
   * 技術用語判定
   */
  private containsTechTerms(text: string): boolean {
    const techTerms = [
      'React',
      'TypeScript',
      'JavaScript',
      'Node.js',
      'API',
      'データベース',
      'SQL',
      'HTML',
      'CSS',
      'Git',
      'エラー',
      'バグ',
      'デバッグ',
      'テスト',
      'ビルド',
    ]
    return techTerms.some(term => text.includes(term))
  }

  /**
   * 技術キーワードフィルタリング
   */
  private filterTechKeywords(keywords: string[]): string[] {
    return keywords.filter(keyword => this.containsTechTerms(keyword))
  }

  /**
   * トピックから要約生成
   */
  private createSummaryFromTopics(topics: string[]): string {
    if (topics.length === 0) {
      return '一般的な会話'
    }

    if (topics.length === 1) {
      return `${topics[0]}について話し合いました`
    }

    if (topics.length === 2) {
      return `${topics[0]}と${topics[1]}について話し合いました`
    }

    return `${topics[0]}、${topics[1]}など複数のトピックについて話し合いました`
  }

  /**
   * テキスト切り詰め
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    return text.substring(0, maxLength - 3) + '...'
  }
}
