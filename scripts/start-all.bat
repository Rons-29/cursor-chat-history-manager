@echo off
setlocal enabledelayedexpansion

REM Chat History Manager - 全サービス起動スクリプト (Windows)
REM 使用方法: scripts\start-all.bat [mode]
REM mode: dev (開発), prod (本番), quick (クイック開発)

set "mode=%~1"
if "%mode%"=="" set "mode=help"

echo 🎉 やるぞ！Chat History Manager！
echo - セキュリティ → 🔒 バッチリ！
echo - パフォーマンス → ⚡ 最速！
echo - コード品質 → ✨ 完璧！
echo 今日も最高の履歴管理システムを作ります！
echo.

if "%mode%"=="dev" goto :dev_mode
if "%mode%"=="prod" goto :prod_mode
if "%mode%"=="quick" goto :quick_mode
goto :show_help

:dev_mode
echo [INFO] 🚀 開発モードで起動します
echo [INFO] サービス構成:
echo [INFO]   - API: Real API Server (http://localhost:3001)
echo [INFO]   - WEB: Vite Dev Server (http://localhost:5173)
echo [INFO]   - CLI: Integration Watch Service
echo.

call :check_prerequisites
if errorlevel 1 exit /b 1

call :create_directories
call :build_typescript
if errorlevel 1 exit /b 1

echo [STEP] 開発モードで起動中...
npm run dev:all
goto :end

:prod_mode
echo [INFO] 🏭 本番モードで起動します
echo [INFO] サービス構成:
echo [INFO]   - API: Real API Server (http://localhost:3001)
echo [INFO]   - WEB: Vite Preview Server (http://localhost:4173)
echo.

call :check_prerequisites
if errorlevel 1 exit /b 1

call :create_directories
call :build_typescript
if errorlevel 1 exit /b 1

echo [STEP] Web アプリケーションをビルド中...
npm run web:build
if errorlevel 1 (
    echo [ERROR] Web ビルドに失敗しました
    exit /b 1
)

echo [STEP] 本番モードで起動中...
npm run start:all
goto :end

:quick_mode
echo [INFO] ⚡ クイック開発モードで起動します
echo [INFO] サービス構成:
echo [INFO]   - MOCK: Simple Mock API Server (http://localhost:3001)
echo [INFO]   - WEB: Vite Dev Server (http://localhost:5173)
echo.
echo [WARN] 注意: このモードはモックAPIを使用します（実際のデータ処理は行われません）
echo.

call :check_prerequisites
if errorlevel 1 exit /b 1

echo [STEP] クイック開発モードで起動中...
npm run dev:quick
goto :end

:show_help
echo Chat History Manager - 全サービス起動スクリプト (Windows)
echo.
echo 使用方法:
echo   scripts\start-all.bat [mode]
echo.
echo モード:
echo   dev     - 開発モード (Real API + Web + CLI監視)
echo   prod    - 本番モード (Real API + Web本番ビルド)
echo   quick   - クイック開発モード (Mock API + Web)
echo   help    - このヘルプを表示
echo.
echo 例:
echo   scripts\start-all.bat dev
echo   scripts\start-all.bat quick
goto :end

:check_prerequisites
echo [STEP] 前提条件をチェック中...

REM Node.js チェック
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js がインストールされていません
    exit /b 1
)

REM node_modules チェック
if not exist "node_modules" (
    echo [WARN] node_modules が見つかりません。npm install を実行します...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install に失敗しました
        exit /b 1
    )
)

echo [INFO] 前提条件チェック完了
exit /b 0

:create_directories
echo [STEP] 必要なディレクトリを作成中...

if not exist "data" mkdir data
if not exist "data\chat-history" mkdir data\chat-history
if not exist "data\cursor-logs" mkdir data\cursor-logs
if not exist "logs" mkdir logs
if not exist "dist" mkdir dist

echo [INFO] ディレクトリ作成完了
exit /b 0

:build_typescript
echo [STEP] TypeScript をビルド中...

npm run build
if errorlevel 1 (
    echo [ERROR] TypeScript ビルドに失敗しました
    exit /b 1
)

echo [INFO] TypeScript ビルド完了
exit /b 0

:end
echo.
echo [INFO] スクリプトが終了しました
pause 