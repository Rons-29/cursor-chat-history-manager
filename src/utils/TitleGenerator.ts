/**
 * AI対話記録の自動タイトル生成ユーティリティ
 * コンテンツベースで意味のあるタイトルを生成
 */

export interface TitleGenerationResult {
  title: string
  confidence: 'high' | 'medium' | 'low'
  keywords: string[]
  questionType: 'how-to' | 'evaluation' | 'debugging' | 'general' | 'request'
}

export class TitleGenerator {
  private static readonly MAX_TITLE_LENGTH = 60
  private static readonly FALLBACK_TITLE = 'AI対話記録'

  /**
   * キーワードパターンマッピング
   */
  private static readonly KEYWORD_PATTERNS = {
    evaluation: {
      keywords: [
        '点数',
        '評価',
        '採点',
        'スコア',
        '判定',
        '比較',
        'ランキング',
      ],
      templates: [
        '${keyword}についての質問',
        '${content_summary} - 評価相談',
        '評価システム相談',
      ],
    },
    howTo: {
      keywords: [
        '方法',
        'やり方',
        'どうやって',
        'どうすれば',
        '手順',
        '作り方',
      ],
      templates: [
        '${content_summary} - 実装方法',
        '${keyword}についての質問',
        '実装手順の相談',
      ],
    },
    debugging: {
      keywords: ['エラー', 'バグ', '動かない', '問題', '修正', 'デバッグ'],
      templates: [
        '${content_summary} - エラー対応',
        '${keyword}の解決方法',
        'トラブルシューティング',
      ],
    },
    request: {
      keywords: ['作って', '実装して', '教えて', 'お願い', '手伝って', '生成'],
      templates: [
        '${content_summary} - 実装依頼',
        '${keyword}の支援要請',
        '機能実装の相談',
      ],
    },
  }

  /**
   * メインのタイトル生成メソッド
   */
  static generateTitle(
    content: string,
    context?: {
      project?: string
      timestamp?: Date
    }
  ): TitleGenerationResult {
    try {
      // 1. 基本的なクリーニング
      const cleanContent = this.cleanContent(content)

      // 2. 質問タイプを判定
      const questionType = this.detectQuestionType(cleanContent)

      // 3. キーワードを抽出
      const keywords = this.extractKeywords(cleanContent, questionType)

      // 4. タイトルを生成
      const title = this.buildTitle(
        cleanContent,
        questionType,
        keywords,
        context
      )

      // 5. 信頼度を計算
      const confidence = this.calculateConfidence(
        cleanContent,
        keywords,
        questionType
      )

      return {
        title,
        confidence,
        keywords,
        questionType,
      }
    } catch (error) {
      console.warn('タイトル生成エラー:', error)
      return {
        title: this.generateFallbackTitle(content, context),
        confidence: 'low',
        keywords: [],
        questionType: 'general',
      }
    }
  }

  /**
   * コンテンツのクリーニング
   */
  private static cleanContent(content: string): string {
    return content
      .trim()
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 200) // 最初の200文字まで
  }

  /**
   * 質問タイプの検出
   */
  private static detectQuestionType(
    content: string
  ): TitleGenerationResult['questionType'] {
    const lowerContent = content.toLowerCase()

    // 優先度順でチェック
    for (const [type, config] of Object.entries(this.KEYWORD_PATTERNS)) {
      if (config.keywords.some(keyword => lowerContent.includes(keyword))) {
        return type as TitleGenerationResult['questionType']
      }
    }

    // 疑問符の存在チェック
    if (content.includes('？') || content.includes('?')) {
      return 'general'
    }

    return 'general'
  }

  /**
   * キーワード抽出
   */
  private static extractKeywords(
    content: string,
    questionType: TitleGenerationResult['questionType']
  ): string[] {
    const keywords: string[] = []
    const lowerContent = content.toLowerCase()

    // 質問タイプ別のキーワード抽出
    const patterns =
      this.KEYWORD_PATTERNS[questionType as keyof typeof this.KEYWORD_PATTERNS]
    if (patterns) {
      patterns.keywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
          keywords.push(keyword)
        }
      })
    }

    // 一般的な重要キーワード
    const generalKeywords = [
      'API',
      'データベース',
      '実装',
      '設計',
      'テスト',
      'デプロイ',
      'React',
      'TypeScript',
      'Node.js',
      'Express',
      'SQLite',
    ]

    generalKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        keywords.push(keyword)
      }
    })

    return keywords.slice(0, 5) // 最大5個まで
  }

  /**
   * タイトル構築
   */
  private static buildTitle(
    content: string,
    questionType: TitleGenerationResult['questionType'],
    keywords: string[],
    context?: { project?: string; timestamp?: Date }
  ): string {
    // コンテンツ要約の生成
    const contentSummary = this.generateContentSummary(content, keywords)

    // 質問タイプ別のテンプレート適用
    const patterns =
      this.KEYWORD_PATTERNS[questionType as keyof typeof this.KEYWORD_PATTERNS]
    if (patterns && keywords.length > 0) {
      const template = patterns.templates[0]
      let title = template
        .replace('${content_summary}', contentSummary)
        .replace('${keyword}', keywords[0])

      // プロジェクト情報の追加
      if (context?.project && title.length < 40) {
        title += ` (${context.project})`
      }

      return this.truncateTitle(title)
    }

    // フォールバック: コンテンツベース
    return this.truncateTitle(
      contentSummary || this.generateFallbackTitle(content, context)
    )
  }

  /**
   * コンテンツ要約生成
   */
  private static generateContentSummary(
    content: string,
    keywords: string[]
  ): string {
    // 実際のコンテンツ例: "候補あげてもらったもので点数をつけるなら？"
    if (content.includes('候補') && content.includes('点数')) {
      return '点数評価についての質問'
    }

    if (content.includes('エラー') || content.includes('問題')) {
      return 'エラー対応相談'
    }

    if (content.includes('実装') || content.includes('作って')) {
      return '実装支援要請'
    }

    if (content.includes('方法') || content.includes('やり方')) {
      return '実装方法の質問'
    }

    // キーワードベースの要約
    if (keywords.length > 0) {
      return `${keywords[0]}に関する相談`
    }

    // 最後のフォールバック
    const firstSentence = content.split(/[。！？]|[.!?]|\n/)[0]
    return (
      firstSentence.substring(0, 30) + (firstSentence.length > 30 ? '...' : '')
    )
  }

  /**
   * 信頼度計算
   */
  private static calculateConfidence(
    content: string,
    keywords: string[],
    questionType: TitleGenerationResult['questionType']
  ): TitleGenerationResult['confidence'] {
    let score = 0

    // キーワード数による加点
    score += keywords.length * 20

    // 質問タイプの明確さ
    if (questionType !== 'general') score += 30

    // コンテンツの長さ
    if (content.length > 10 && content.length < 100) score += 20

    // 日本語の自然さ
    if (content.includes('？') || content.includes('。')) score += 10

    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  /**
   * フォールバックタイトル生成
   */
  private static generateFallbackTitle(
    content: string,
    context?: { timestamp?: Date }
  ): string {
    const timestamp = context?.timestamp || new Date()
    const dateStr = timestamp.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
    })

    return `AI対話記録 (${dateStr})`
  }

  /**
   * タイトル長制限
   */
  private static truncateTitle(title: string): string {
    if (title.length <= this.MAX_TITLE_LENGTH) {
      return title
    }

    return title.substring(0, this.MAX_TITLE_LENGTH - 3) + '...'
  }

  /**
   * 複数メッセージからのタイトル生成
   */
  static generateTitleFromMessages(
    messages: Array<{ content: string; role: string }>
  ): TitleGenerationResult {
    // 最初のユーザーメッセージを優先
    const userMessage = messages.find(m => m.role === 'user')
    if (userMessage) {
      return this.generateTitle(userMessage.content)
    }

    // フォールバック: すべてのメッセージを結合
    const combinedContent = messages
      .map(m => m.content)
      .join(' ')
      .substring(0, 200)
    return this.generateTitle(combinedContent)
  }
}
