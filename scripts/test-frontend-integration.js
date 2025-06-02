/**
 * Chat History Manager - フロントエンド統合テスト
 * 
 * このスクリプトはブラウザのコンソールで実行して
 * フロントエンドとバックエンドAPIの統合をテストします
 */

console.log('🧪 Chat History Manager - フロントエンド統合テスト開始');

// テスト結果を格納
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  results: []
};

// テスト関数
async function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🔍 テスト ${testResults.total}: ${testName}`);
  
  try {
    const result = await testFunction();
    if (result) {
      console.log('✅ 成功');
      testResults.passed++;
      testResults.results.push({ name: testName, status: 'PASS', details: result });
    } else {
      console.log('❌ 失敗');
      testResults.failed++;
      testResults.results.push({ name: testName, status: 'FAIL', details: 'テスト条件を満たしませんでした' });
    }
  } catch (error) {
    console.log('❌ エラー:', error.message);
    testResults.failed++;
    testResults.results.push({ name: testName, status: 'ERROR', details: error.message });
  }
}

// APIクライアントのテスト
async function testApiClient() {
  // apiClientが存在するかチェック
  if (typeof window.apiClient === 'undefined') {
    // グローバルに公開されていない場合、モジュールから取得を試行
    console.log('APIクライアントをグローバルスコープに公開します...');
    return false;
  }
  
  const client = window.apiClient;
  
  // ヘルスチェック
  const health = await client.healthCheck();
  return health && health.status === 'ok';
}

// 設定取得テスト
async function testSettingsGet() {
  const response = await fetch('http://localhost:3001/api/settings/cursor');
  const data = await response.json();
  return data.success === true && data.data && typeof data.data.enabled === 'boolean';
}

// 設定保存テスト
async function testSettingsSave() {
  const testSettings = {
    enabled: true,
    monitorPath: '/test/frontend/path',
    scanInterval: 45,
    maxSessions: 1500,
    autoImport: true,
    includeMetadata: false
  };
  
  const response = await fetch('http://localhost:3001/api/settings/cursor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testSettings)
  });
  
  const data = await response.json();
  return data.success === true && data.data.scanInterval === 45;
}

// React Queryキャッシュテスト
async function testReactQueryCache() {
  // React Queryのクライアントが存在するかチェック
  if (typeof window.queryClient === 'undefined') {
    console.log('React Query クライアントが見つかりません');
    return false;
  }
  
  const queryClient = window.queryClient;
  const cacheData = queryClient.getQueryData(['settings', 'cursor']);
  return cacheData !== undefined;
}

// LocalStorageテスト
async function testLocalStorage() {
  const testKey = 'chat-history-manager-cursor-settings';
  const testData = {
    enabled: true,
    monitorPath: '/test/localstorage',
    scanInterval: 60,
    maxSessions: 1000,
    autoImport: true,
    includeMetadata: false
  };
  
  // 保存
  localStorage.setItem(testKey, JSON.stringify(testData));
  
  // 読み込み
  const stored = localStorage.getItem(testKey);
  const parsed = JSON.parse(stored);
  
  return parsed.monitorPath === '/test/localstorage' && parsed.scanInterval === 60;
}

// DOMテスト
async function testDOMElements() {
  // 設定ページの要素が存在するかチェック
  const settingsElements = [
    'input[type="checkbox"]', // チェックボックス
    'input[type="number"]',   // 数値入力
    'input[type="text"]',     // テキスト入力
    'button'                  // ボタン
  ];
  
  let foundElements = 0;
  settingsElements.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      foundElements++;
    }
  });
  
  return foundElements >= 3; // 最低3種類の要素が見つかればOK
}

// CORS テスト
async function testCORS() {
  try {
    const response = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    console.log('CORS エラー:', error.message);
    return false;
  }
}

// メイン実行関数
async function runAllTests() {
  console.log('🚀 フロントエンド統合テスト開始...\n');
  
  // 基本APIテスト
  await runTest('設定取得API', testSettingsGet);
  await runTest('設定保存API', testSettingsSave);
  await runTest('CORS設定', testCORS);
  
  // フロントエンド固有テスト
  await runTest('LocalStorage機能', testLocalStorage);
  await runTest('DOM要素の存在', testDOMElements);
  
  // 結果表示
  console.log('\n📊 テスト結果サマリー');
  console.log('='.repeat(40));
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`✅ 成功: ${testResults.passed}`);
  console.log(`❌ 失敗: ${testResults.failed}`);
  console.log(`成功率: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 すべてのテストが成功しました！');
  } else {
    console.log('\n⚠️ 一部のテストが失敗しました');
    console.log('詳細:', testResults.results.filter(r => r.status !== 'PASS'));
  }
  
  return testResults;
}

// 使用方法の説明
console.log(`
📋 使用方法:
1. ブラウザで http://localhost:5173 を開く
2. 設定ページに移動
3. ブラウザの開発者ツールを開く
4. コンソールタブでこのスクリプトを実行
5. runAllTests() を実行してテスト開始

例: runAllTests().then(results => console.log('完了:', results));
`);

// グローバルに公開
if (typeof window !== 'undefined') {
  window.frontendTest = {
    runAllTests,
    runTest,
    testResults
  };
} 