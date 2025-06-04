# ChatFlow UI ベストプラクティス

## 🎯 概要

ChatFlowプロジェクトにおけるUI開発のベストプラクティス集です。Cursor風デザインシステムを基盤とした、統一性・美しさ・使いやすさを追求したユーザーインターフェースの構築指針です。

## 🎨 デザインシステム基盤

### 🎯 **デザインコンセプト**
- **Cursor風カラーシステム**: 青紫系を基調とした洗練されたカラーパレット
- **モダンミニマリズム**: 清潔感のあるシンプルなインターフェース
- **プロフェッショナルUX**: 開発者向けツールとしての使いやすさを優先
- **ダークモード完全対応**: 目に優しい暗い背景での作業環境

### 🎨 **カラーシステム**

#### **プライマリカラー（Cursor風）**
```typescript
const primaryColors = {
  50: '#f0f4ff',   // 背景・アクセント
  100: '#e0ebff',  // セカンダリ背景
  200: '#c7d8ff',  // ホバー状態
  300: '#a4bcff',  // ボーダー・デバイダー
  400: '#8b9aff',  // アクティブ状態
  500: '#6366f1',  // メインプライマリ
  600: '#4f46e5',  // ボタン・リンク
  700: '#4338ca',  // 強調・フォーカス
  800: '#3730a3',  // ヘッダー・重要要素
  900: '#312e81',  // テキスト・コントラスト
}
```

#### **セマンティックカラー**
```typescript
// 成功・エラー・警告・情報のカラーパレット
const semanticColors = {
  success: { main: '#10b981', bg: '#ecfdf5', text: '#047857' },
  error: { main: '#ef4444', bg: '#fef2f2', text: '#b91c1c' },
  warning: { main: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  info: { main: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' }
}
```

#### **グレースケール（ダークモード対応）**
```typescript
const grayColors = {
  light: {
    50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb',
    300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280',
    600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827'
  },
  dark: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0',
    300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b',
    600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a'
  }
}
```

## 🧩 コンポーネント設計原則

### 📦 **コンポーネント階層**

```typescript
// コンポーネント分類と配置規則
interface ComponentHierarchy {
  'ui/': {
    purpose: '再利用可能な基本UIコンポーネント'
    examples: ['Button', 'Input', 'Card', 'Modal', 'Loading']
    characteristics: ['props駆動', 'スタイリング完結', '外部依存なし']
  }
  
  'components/': {
    purpose: 'ビジネスロジック付きコンポーネント'
    examples: ['SessionCard', 'SearchFilters', 'ThemeToggle']
    characteristics: ['hooks使用', 'API呼び出し可', 'ドメイン知識あり']
  }
  
  'pages/': {
    purpose: 'ルーティング対応のページコンポーネント'
    examples: ['Dashboard', 'Sessions', 'Settings']
    characteristics: ['レイアウト制御', '複数コンポーネント組み合わせ']
  }
  
  'layouts/': {
    purpose: 'ページ全体のレイアウト構造'
    examples: ['Layout', 'Sidebar', 'Header']
    characteristics: ['ナビゲーション', 'レスポンシブ']
  }
}
```

### 🔧 **コンポーネント実装パターン**

#### **基本UIコンポーネント（ui/）**
```typescript
interface ButtonProps {
  readonly variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  readonly size: 'sm' | 'md' | 'lg' | 'xl'
  readonly disabled?: boolean
  readonly loading?: boolean
  readonly icon?: React.ReactNode
  readonly children: React.ReactNode
  readonly onClick?: () => void
  readonly className?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  onClick,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-700'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
}
```

#### **カードコンポーネント**
```typescript
interface CardProps {
  readonly variant?: 'default' | 'elevated' | 'outlined' | 'stats'
  readonly padding?: 'sm' | 'md' | 'lg' | 'xl'
  readonly hover?: boolean
  readonly className?: string
  readonly children: React.ReactNode
  readonly onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  className = '',
  children,
  onClick
}) => {
  const baseClasses = 'bg-white dark:bg-gray-800 rounded-lg transition-all duration-200'
  
  const variantClasses = {
    default: 'shadow-sm border border-gray-200 dark:border-gray-700',
    elevated: 'shadow-lg border-none',
    outlined: 'border-2 border-gray-200 dark:border-gray-600 shadow-none',
    stats: 'shadow-md border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900'
  }
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }
  
  const hoverClasses = hover 
    ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' 
    : ''
  
  return (
    <div
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hoverClasses}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
```

### 🎛️ **統一されたスタイリングクラス**

#### **テキストスタイル**
```css
/* タイポグラフィーシステム */
.text-heading-xl { @apply text-4xl font-bold leading-tight text-gray-900 dark:text-gray-100; }
.text-heading-lg { @apply text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100; }
.text-heading-md { @apply text-2xl font-semibold leading-snug text-gray-900 dark:text-gray-100; }
.text-heading-sm { @apply text-xl font-semibold leading-snug text-gray-800 dark:text-gray-200; }

.text-body-lg { @apply text-lg leading-relaxed text-gray-700 dark:text-gray-300; }
.text-body-md { @apply text-base leading-normal text-gray-700 dark:text-gray-300; }
.text-body-sm { @apply text-sm leading-normal text-gray-600 dark:text-gray-400; }

.text-caption { @apply text-xs leading-normal text-gray-500 dark:text-gray-500; }
.text-overline { @apply text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-500; }
```

#### **レイアウトパターン**
```css
/* 頻繁に使用するレイアウトパターン */
.layout-container { @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8; }
.layout-grid { @apply grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4; }
.layout-flex-between { @apply flex items-center justify-between; }
.layout-flex-center { @apply flex items-center justify-center; }
.layout-stack { @apply flex flex-col space-y-4; }

/* ダッシュボード専用レイアウト */
.dashboard-container { @apply min-h-screen bg-gray-50 dark:bg-gray-900; }
.dashboard-content { @apply flex-1 p-6 space-y-6; }
.dashboard-grid { @apply grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4; }
```

#### **アニメーション・トランジション**
```css
/* 統一されたアニメーション */
.animate-fade-in { @apply animate-fade-in; }
.animate-slide-up { @apply animate-slide-up; }
.animate-slide-down { @apply animate-slide-down; }

/* インタラクション */
.interactive { @apply transition-all duration-200 hover:scale-105; }
.card-hover { @apply transition-all duration-200 hover:shadow-lg hover:-translate-y-1; }
.button-hover { @apply transition-all duration-200 hover:bg-opacity-90 active:scale-95; }
```

## 📱 レスポンシブデザイン

### 🖥️ **ブレイクポイント戦略**

```typescript
const breakpoints = {
  sm: '640px',   // タブレット縦向き
  md: '768px',   // タブレット横向き
  lg: '1024px',  // デスクトップ小
  xl: '1280px',  // デスクトップ大
  '2xl': '1536px' // ワイドスクリーン
}

// レスポンシブ実装パターン
const ResponsiveGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
    {/* コンテンツ */}
  </div>
)
```

### 📐 **モバイルファースト設計**

```css
/* モバイル最適化の基本パターン */
.mobile-optimized {
  /* デフォルト（モバイル）スタイル */
  @apply px-4 py-3 text-sm;
  
  /* タブレット以上 */
  @screen md {
    @apply px-6 py-4 text-base;
  }
  
  /* デスクトップ以上 */
  @screen lg {
    @apply px-8 py-6 text-lg;
  }
}

/* タッチ対応 */
.touch-target {
  @apply min-h-[44px] min-w-[44px]; /* 44pxはタッチに最適なサイズ */
}
```

## 🌙 ダークモード実装

### 🎨 **ダークモード対応クラス**

```typescript
// ダークモード切り替えコンポーネント
export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false)
  
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])
  
  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
```

### 🎯 **ダークモード設計方針**

```css
/* ダークモード専用カラーオーバーライド */
.dark {
  /* 基本背景・テキスト */
  .bg-white { @apply bg-gray-800; }
  .bg-gray-50 { @apply bg-gray-900; }
  .bg-gray-100 { @apply bg-gray-800; }
  .text-gray-900 { @apply text-gray-100; }
  .text-gray-800 { @apply text-gray-200; }
  
  /* カード・コンテナ */
  .card { @apply bg-gray-800 border-gray-700; }
  .shadow-lg { @apply shadow-2xl shadow-black/50; }
  
  /* フォーム要素 */
  .input-field { @apply bg-gray-700 border-gray-600 text-gray-100; }
  .input-field:focus { @apply border-primary-400 ring-primary-400; }
}
```

## 🔄 状態管理とフィードバック

### ⏳ **ローディング状態**

```typescript
// 統一ローディングインジケータ
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]}`} />
  )
}

// プログレスバー
export const ProgressBar: React.FC<{ 
  progress: number; 
  label?: string 
}> = ({ progress, label }) => (
  <div className="w-full">
    {label && <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</div>}
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div 
        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
      {Math.round(progress)}%
    </div>
  </div>
)
```

### 🚨 **エラー・成功状態**

```typescript
// アラートコンポーネント
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  dismissible?: boolean
  onDismiss?: () => void
}

export const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  dismissible = false,
  onDismiss
}) => {
  const styles = {
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200'
  }
  
  const icons = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    info: 'ℹ️'
  }
  
  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>
      <div className="flex items-start">
        <span className="mr-3 text-lg">{icons[type]}</span>
        <div className="flex-1">
          {title && <h3 className="font-semibold mb-1">{title}</h3>}
          <p className="text-sm">{message}</p>
        </div>
        {dismissible && (
          <button 
            onClick={onDismiss}
            className="ml-3 text-lg hover:opacity-70"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
```

## 🏃‍♂️ パフォーマンス最適化

### ⚡ **最適化指針**

```typescript
// 重いコンポーネントのメモ化
export const ExpensiveComponent = React.memo<Props>(({ data, config }) => {
  // 重い計算
  const processedData = useMemo(() => {
    return data.map(item => complexProcessing(item))
  }, [data])
  
  // デバウンス検索
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      performSearch(query)
    }, 300),
    []
  )
  
  return (
    <div className="optimized-component">
      {processedData.map(item => (
        <ItemComponent key={item.id} item={item} />
      ))}
    </div>
  )
})

// 仮想化リスト（大量データ表示）
export const VirtualizedList: React.FC<{ items: Item[] }> = ({ items }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 })
  
  const visibleItems = useMemo(() => 
    items.slice(visibleRange.start, visibleRange.end),
    [items, visibleRange]
  )
  
  return (
    <div 
      className="virtualized-list h-96 overflow-y-auto"
      onScroll={handleScroll}
    >
      {visibleItems.map(item => (
        <div key={item.id} className="item">
          {item.content}
        </div>
      ))}
    </div>
  )
}
```

### 🚀 **画像・メディア最適化**

```typescript
// レスポンシブ画像コンポーネント
export const OptimizedImage: React.FC<{
  src: string
  alt: string
  className?: string
  lazy?: boolean
}> = ({ src, alt, className = '', lazy = true }) => (
  <img
    src={src}
    alt={alt}
    loading={lazy ? 'lazy' : 'eager'}
    className={`transition-opacity duration-300 ${className}`}
    onLoad={(e) => (e.currentTarget.style.opacity = '1')}
    style={{ opacity: 0 }}
  />
)
```

## ♿ アクセシビリティ（a11y）

### 🎯 **アクセシビリティ必須事項**

```typescript
// キーボードナビゲーション対応
export const AccessibleButton: React.FC<ButtonProps> = (props) => (
  <button
    {...props}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        props.onClick?.()
      }
    }}
    aria-label={props['aria-label'] || props.children?.toString()}
  >
    {props.children}
  </button>
)

// スクリーンリーダー対応
export const ScreenReaderText: React.FC<{ children: string }> = ({ children }) => (
  <span className="sr-only">{children}</span>
)

// フォーカス管理
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])
  
  return isOpen ? (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {children}
    </div>
  ) : null
}
```

### 🎨 **カラーコントラスト**

```css
/* WCAG AA準拠のコントラスト比確保 */
.text-primary { 
  @apply text-primary-700; /* 4.5:1以上のコントラスト */
}

.dark .text-primary { 
  @apply text-primary-300; /* ダークモードでも4.5:1以上 */
}

/* フォーカスインジケータ */
.focus-visible {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800;
}
```

## 📏 コーディング規約

### 🏗️ **ファイル・フォルダ構造**

```
web/src/
├── components/           # ビジネスロジック付きコンポーネント
│   ├── forms/           # フォーム関連
│   ├── navigation/      # ナビゲーション関連  
│   ├── data-display/    # データ表示関連
│   └── layout/          # レイアウト関連
├── components/ui/        # 基本UIコンポーネント
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   └── index.ts        # 一括エクスポート
├── pages/               # ページコンポーネント
├── hooks/               # カスタムフック
├── utils/               # ユーティリティ関数
├── types/               # TypeScript型定義
└── styles/              # グローバルスタイル
```

### 📝 **命名規則**

```typescript
// コンポーネント命名
export const UserProfileCard: React.FC<Props> = () => {} // PascalCase

// フック命名
export const useSessionData = () => {}                    // camelCase + use prefix

// 型定義命名
interface SessionCardProps {}                             // PascalCase + Props suffix
type LoadingState = 'idle' | 'loading' | 'error'         // PascalCase

// ファイル命名
UserProfileCard.tsx                                       // PascalCase
useSessionData.ts                                         // camelCase
types.ts                                                  // lowercase
```

### 🔧 **型安全性**

```typescript
// Propsの型定義（readonly推奨）
interface CardProps {
  readonly title: string
  readonly description?: string
  readonly variant?: 'default' | 'elevated' | 'outlined'
  readonly onClick?: () => void
  readonly children?: React.ReactNode
}

// 厳格なイベントハンドラ
const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()
  // 処理
}, [])

// 型ガード使用
const isValidSession = (data: unknown): data is Session => {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'title' in data
}
```

## 🧪 テスト戦略

### 🔬 **コンポーネントテスト**

```typescript
// Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from './Button'

describe('Button', () => {
  it('正しくクリックイベントを処理する', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>クリック</Button>)
    
    fireEvent.click(screen.getByRole('button', { name: 'クリック' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('ローディング状態で正しく無効化される', () => {
    render(<Button loading>送信</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})
```

### 📊 **ビジュアルテスト**

```typescript
// Storybook設定
export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost']
    }
  }
}

export const Primary = {
  args: {
    variant: 'primary',
    children: 'プライマリボタン'
  }
}

export const Loading = {
  args: {
    variant: 'primary',
    loading: true,
    children: '送信中...'
  }
}
```

## 📊 パフォーマンス監視

### 📈 **Core Web Vitals対応**

```typescript
// パフォーマンス計測
export const usePerformanceMonitoring = () => {
  useEffect(() => {
    // LCP（Largest Contentful Paint）
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime)
        }
      }
    })
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] })
    
    return () => observer.disconnect()
  }, [])
}

// バンドルサイズ監視
const LazyComponent = React.lazy(() => import('./HeavyComponent'))

export const OptimizedPage: React.FC = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <LazyComponent />
  </Suspense>
)
```

## 🚀 開発ワークフロー

### 🔄 **開発プロセス**

```bash
# 1. コンポーネント作成前チェックリスト
- [ ] 既存コンポーネントで再利用可能か確認
- [ ] デザインシステムのカラー・タイポグラフィ準拠
- [ ] アクセシビリティ要件確認
- [ ] モバイル・ダークモード対応計画

# 2. 実装中チェックリスト  
- [ ] TypeScript型定義完了
- [ ] Props validation実装
- [ ] ダークモード対応スタイル
- [ ] レスポンシブ対応
- [ ] アクセシビリティ対応（aria-*、role等）

# 3. 完成時チェックリスト
- [ ] Storybook登録
- [ ] 単体テスト作成
- [ ] ビジュアルテスト確認
- [ ] パフォーマンステスト
- [ ] ドキュメント更新
```

### 🛠️ **開発ツール設定**

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## 📚 リソース・参考資料

### 🔗 **外部リソース**
- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/docs)
- [React公式ドキュメント](https://react.dev/)
- [WCAG 2.1 ガイドライン](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs - アクセシビリティ](https://developer.mozilla.org/docs/Web/Accessibility)

### 📖 **プロジェクト内参考ファイル**
- `web/src/components/ui/` - 基本UIコンポーネント実装例
- `web/src/index.css` - カスタムスタイル・Tailwind設定
- `web/tailwind.config.js` - Tailwindカスタマイゼーション
- `docs/FRONTEND_INTEGRATION_GUIDE.md` - フロントエンド統合ガイド

---

**最終更新**: 2025年1月 | **適用範囲**: ChatFlow Web UI全体 | **次回見直し**: 新機能追加時 