# Web版サポート実装計画

## 概要

expo-sqlite v16.xのWASMモジュール解決エラーを修正し、Web版での動作を可能にする。モバイル版の機能は維持しつつ、Web版でも基本的な動作を実現する。

## 問題の詳細

### エラー内容
```
Unable to resolve "./wa-sqlite/wa-sqlite.wasm" from "node_modules/expo-sqlite/web/worker.ts"
```

### 原因
- Expo WebのデフォルトWebpack設定がWASM（WebAssembly）ファイルを適切に処理できない
- expo-sqliteのWeb版実装がWASMベースのSQLiteを使用している

## 実装戦略

### アプローチ
Webpack設定をカスタマイズし、WASMファイルを正しく読み込めるようにする。

### 必要な作業

#### 1. Webpack設定ファイルの作成
**ファイル:** `webpack.config.js`（プロジェクトルート）

**実装内容:**
```javascript
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['expo-sqlite']
      }
    },
    argv
  );

  // WASM support
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
  };

  // WASM loader rule
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  // Resolve extensions
  config.resolve.extensions.push('.wasm');

  return config;
};
```

**理由:**
- `asyncWebAssembly: true` でWASM非同期読み込みを有効化
- `.wasm`ファイルを`webassembly/async`タイプとして処理
- expo-sqliteをBabelトランスパイル対象に追加

#### 2. 必要なパッケージのインストール

**追加パッケージ:**
```json
{
  "@expo/webpack-config": "~22.0.10"
}
```

**インストールコマンド:**
```bash
npm install --save-dev @expo/webpack-config
```

**理由:**
- Expo SDK 54に対応した`@expo/webpack-config`が必要
- カスタムWebpack設定を作成するための基盤

#### 3. package.jsonの依存関係確認

**現在のバージョン（確認済み）:**
- expo: ~54.0.32
- expo-sqlite: ~16.0.10
- react-native-web: ^0.21.0

**追加確認事項:**
- これらのバージョン間の互換性は問題なし

#### 4. Web版の制約事項ドキュメント作成

**ファイル:** `docs/web-limitations.md`

**内容:**
- Web版で実現できない機能のリスト
- モバイル版との差異
- ユーザーへの推奨事項

**主な制約:**
1. **バックアップ無効化不可:** ブラウザのDevTools等でIndexedDBにアクセス可能
2. **通知の制限:** ブラウザ通知はユーザー許可が必要、タイムアウト精度が低い
3. **データ永続性:** ブラウザのストレージクリア機能でデータが消える可能性
4. **フォアグラウンド制約:** ブラウザタブが非アクティブ時の動作制限

## 実装手順

### Phase 1: Webpack設定追加
1. `@expo/webpack-config`をdevDependenciesに追加
2. `webpack.config.js`を作成
3. WASM読み込み設定を追加

### Phase 2: 動作確認
1. Web版ビルドの実行確認
2. SQLite初期化の確認
3. 基本的なCRUD操作の確認

### Phase 3: ドキュメント作成
1. Web版の制約事項をドキュメント化
2. READMEにWeb版の注意事項を追加

## テスト計画

### 動作確認項目

#### Web版
- [ ] `npm run web`でエラーなく起動
- [ ] オンボーディング画面の表示
- [ ] Identity入力の保存
- [ ] Quest入力の保存
- [ ] データベースの初期化
- [ ] IH計算の動作

#### モバイル版（既存機能維持確認）
- [ ] Android版のビルド確認
- [ ] iOS版のビルド確認
- [ ] 既存の通知機能の動作

### テストコマンド
```bash
# Web版
npm run web

# Android版
npm run android

# iOS版
npm run ios

# ユニットテスト
npm test
```

## ロールバック戦略

問題が発生した場合:
1. `webpack.config.js`を削除
2. `@expo/webpack-config`をアンインストール
3. Web版を無効化し、モバイル専用として運用

## 成果物

1. **新規ファイル:**
   - `webpack.config.js`
   - `docs/web-limitations.md`

2. **更新ファイル:**
   - `package.json` (devDependencies追加)
   - `README.md` (Web版の注意事項追加)

3. **確認事項:**
   - Web版でのエラー解消
   - モバイル版の既存機能維持

## 潜在的なリスク

### リスク1: WASM読み込みの非同期性
**影響:** SQLite初期化タイミングの問題
**対策:** アプリ起動時にWASM読み込み完了を待機するロジック追加

### リスク2: ブラウザ互換性
**影響:** 一部ブラウザでWASMがサポートされない
**対策:** ブラウザチェック機能の追加、非対応時のエラーメッセージ表示

### リスク3: パフォーマンス劣化
**影響:** Web版でのSQLite操作が遅い
**対策:** 初期ベンチマークの取得、必要に応じてクエリ最適化

## 実装時の注意事項

1. **既存コードの変更は最小限に:** データベース層は変更しない
2. **プラットフォーム検出:** 必要に応じて`Platform.OS === 'web'`で分岐
3. **エラーハンドリング:** WASM読み込み失敗時の適切なエラー表示

## 依存関係

- 実装前提: 現在のコードベース（expo-sqlite v16.x使用）
- ブロッカー: なし
- 並行作業可能: ドキュメント作成はWebpack設定と並行可能

## 完了条件

- [ ] `npm run web`でエラーなく起動する
- [ ] Web版でオンボーディングフローが完了する
- [ ] Web版でIdentity Healthの計算が動作する
- [ ] モバイル版の既存機能が全て動作する
- [ ] Web版の制約事項がドキュメント化されている
