# Expo SDK 54 依存関係修正 実装計画書 v1.1

**作成日:** 2026-01-28
**改訂日:** 2026-01-28
**前版:** v1.0
**ステータス:** Opusレビュー完了・実装準備完了
**優先度:** Critical

---

## 変更履歴（v1.0 → v1.1）

### Critical問題の修正

| # | 問題 | 修正内容 | セクション |
|---|------|----------|-----------|
| 1 | jest-expo バージョンが未更新 | package.jsonで~54.0.16に修正済み | 2.1, 5.0 |
| 2 | expo-constants依存関係の欠落 | package.jsonに追加、検証手順を追加 | 2.1, 5.0, 6.1 |
| 3 | expo-sqlite v16 API変更の詳細不足 | API移行ガイドを追加 | 9.1 |

### High問題の修正

| # | 問題 | 修正内容 | セクション |
|---|------|----------|-----------|
| 4 | expo-router v6マイグレーション未対応 | マイグレーションガイドを追加 | 9.2 |
| 5 | Jest設定の互換性検証欠落 | Jest設定検証手順を追加 | 6.4 |
| 6 | package-lock.jsonのバックアップなし | バックアップ手順に追加 | 5.1 |
| 7 | React Native 0.76→0.81の大幅更新 | 破壊的変更の確認手順を追加 | 9.3 |

### Medium/Low問題の対応

- Node.jsバージョン検証を追加（5.0.1）
- Expo Go アプリバージョン確認を追加（6.5.2）
- TypeScript互換性検証を追加（6.5.3）

---

## 目次

1. [問題の概要](#1-問題の概要)
2. [現状分析](#2-現状分析)
3. [根本原因](#3-根本原因)
4. [解決策](#4-解決策)
5. [実装手順](#5-実装手順)
6. [検証計画](#6-検証計画)
7. [ロールバック戦略](#7-ロールバック戦略)
8. [リスク分析](#8-リスク分析)
9. [API移行ガイド（新規）](#9-api移行ガイド)
10. [付録](#10-付録)

---

## 1. 問題の概要

### 1.1 現象

Expo開発サーバー起動時に以下の警告が表示され、アプリが正常に動作しない可能性：

```
The following packages should be updated for best compatibility with the installed expo version:
  expo-notifications@0.29.14 - expected version: ~0.32.16
  expo-router@4.0.22 - expected version: ~6.0.22
  expo-sqlite@15.0.6 - expected version: ~16.0.10
  react-native-safe-area-context@4.12.0 - expected version: ~5.6.0
  react-native-screens@4.3.0 - expected version: ~4.16.0
  jest-expo@52.0.6 - expected version: ~54.0.16
```

### 1.2 影響範囲

- **Expo Router (v4 → v6)**: **メジャーアップグレード** - ファイルベースルーティングのAPI変更
- **Expo SQLite (v15 → v16)**: **メジャーアップグレード** - データベースAPIの互換性問題
- **Expo Notifications (v0.29 → v0.32)**: 通知システムの動作不良
- **React Native (0.76 → 0.81)**: コアAPIの変更可能性
- **jest-expo (v52 → v54)**: テスト設定・モックの変更

### 1.3 緊急度

**Critical** - アプリの起動と正常動作に直接影響

---

## 2. 現状分析

### 2.1 package.json vs 実際のインストール状態（修正後）

| パッケージ | package.json (修正後) | node_modules (現在) | 期待値 | 状態 |
|-----------|---------------------|-------------------|--------|------|
| expo | ~54.0.32 | 54.0.32 | ~54.0.32 | ✅ OK |
| expo-constants | ~18.0.13 | なし | ~18.0.13 | ⚠️ 追加 |
| expo-linking | ~8.0.11 | なし | ~8.0.11 | ⚠️ 追加 |
| @expo/metro-runtime | ~6.1.2 | なし | ~6.1.2 | ⚠️ 追加 |
| expo-notifications | ~0.32.16 | 0.29.14 | ~0.32.16 | ❌ NG |
| expo-router | ~6.0.22 | 4.0.22 | ~6.0.22 | ❌ NG |
| expo-sqlite | ~16.0.10 | 15.0.6 | ~16.0.10 | ❌ NG |
| react-native-safe-area-context | ~5.6.0 | 4.12.0 | ~5.6.0 | ❌ NG |
| react-native-screens | ~4.16.0 | 4.3.0 | ~4.16.0 | ❌ NG |
| jest-expo | ~54.0.16 | 52.0.6 | ~54.0.16 | ❌ NG |

**変更点:**
- ✅ `jest-expo` を `~52.0.0` → `~54.0.16` に修正
- ✅ `expo-constants: ~18.0.13` を追加（expo-router v6の要求）
- ✅ `expo-linking: ~8.0.11` を追加（expo-router v6の要求）
- ✅ `@expo/metro-runtime: ~6.1.2` を追加（expo-router v6の要求）

### 2.2 依存関係の状態

```bash
# npm list の実行結果
npm error invalid: expo-notifications@0.29.14
npm error invalid: expo-router@4.0.22
npm error invalid: expo-sqlite@15.0.6
```

**診断:** package.jsonは修正済みだが、node_modulesとpackage-lock.jsonに古いバージョンの情報が残存。

---

## 3. 根本原因

### 3.1 原因の特定

1. **package.json更新後の不完全なインストール**
   - package.jsonのバージョンが更新されたが、`npm install`が正常完了していない
   - package-lock.jsonに古いバージョンの解決情報が残存

2. **依存関係の競合**
   - expo-router v6 は expo-constants@^18.0.13 を要求（修正済み）
   - 現在のnode_modulesには古いexpo-constants が存在
   - peer dependency の競合によりインストールが中断

3. **キャッシュの問題**
   - npm キャッシュに古いバージョンの情報が残存
   - node_modules に不完全な状態のパッケージが残存

### 3.2 再現手順

```bash
# 以下のコマンドで問題が再現
npm install
# または
npx expo install expo-router expo-sqlite expo-notifications --fix
```

エラー:
```
npm error ERESOLVE could not resolve
npm error Conflicting peer dependency: expo-constants@18.0.13
```

---

## 4. 解決策

### 4.1 解決アプローチ

**クリーンインストール戦略** を採用：

1. 既存の依存関係を完全削除
2. キャッシュをクリア
3. package-lock.jsonを再生成
4. 正しいバージョンで完全再インストール
5. API変更の確認と必要に応じてコード修正

### 4.2 なぜこのアプローチか

| アプローチ | メリット | デメリット | 採用 |
|-----------|---------|-----------|------|
| `npm update` | 簡単 | 競合解決できない | ❌ |
| `npm install --force` | 強制インストール | 不整合が残る可能性 | ❌ |
| `npm install --legacy-peer-deps` | ピア依存無視 | 実行時エラーの危険 | ❌ |
| **クリーンインストール + API確認** | **完全解決** | **時間がかかる** | ✅ |

### 4.3 期待される結果

- すべてのパッケージがExpo SDK 54互換バージョンになる
- 依存関係の競合が完全解消
- Expo起動時の警告が消える
- すべてのテストがパス
- アプリが正常起動する

---

## 5. 実装手順

### 5.0 事前準備

#### 5.0.1 環境確認

```bash
# Node.js バージョン確認（18以上が必要）
node --version
# 出力例: v18.17.0

# npm バージョン確認
npm --version
# 出力例: 9.6.7

# 現在のディレクトリ確認
pwd
# 期待値: /Users/noritakasawada/AI_P/one-day-os
```

**要件:**
- Node.js: 18.x 以上
- npm: 9.x 以上

#### 5.0.2 package.json の最終確認

```bash
# 修正済みの package.json を確認
cat package.json | grep -E "(expo-router|expo-sqlite|expo-constants|jest-expo)"
```

**期待される出力:**
```json
"expo-constants": "~18.0.13",
"expo-router": "~6.0.22",
"expo-sqlite": "~16.0.10",
"jest-expo": "~54.0.16",
```

### 5.1 バックアップ手順

```bash
# Step 1: package.json のバックアップ
cp package.json package.json.backup

# Step 2: package-lock.json のバックアップ（v1.1で追加）
cp package-lock.json package-lock.json.backup

# Step 3: 現在のインストール状態を記録
npm list --depth=0 > npm-list-before.txt 2>&1

# Step 4: Gitで変更を確認（必要に応じてコミット）
git status
git diff package.json

# （オプション）変更をコミット
# git add package.json
# git commit -m "fix: Update dependencies for Expo SDK 54 compatibility"
```

**所要時間:** 約1分

### 5.2 クリーンアップ手順

```bash
# Step 5: node_modules を完全削除
rm -rf node_modules

# Step 6: package-lock.json を削除
rm -f package-lock.json

# Step 7: npm キャッシュをクリア
npm cache clean --force

# Step 8: （オプション）グローバルキャッシュもクリア
# rm -rf ~/.npm/_cacache
```

**所要時間:** 約1-2分

### 5.3 再インストール手順

```bash
# Step 9: 依存関係を再インストール
npm install

# 実行時間: 約3-5分（ネットワーク速度に依存）
```

**期待される出力:**
```
added 1234 packages, and audited 1235 packages in 3m

123 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**エラーが発生した場合:**
- Section 7（ロールバック戦略）を参照
- エラーメッセージを全文記録

### 5.4 インストール後の即時確認

```bash
# Step 10: インストール状態を確認
npm list --depth=0 > npm-list-after.txt

# Step 11: 重要パッケージのバージョン確認
npm list expo expo-router expo-sqlite expo-notifications expo-constants jest-expo --depth=0
```

**期待される出力:**
```
one-day-os@1.0.0 /Users/noritakasawada/AI_P/one-day-os
├── expo@54.0.32
├── expo-router@6.0.22
├── expo-sqlite@16.0.10
├── expo-notifications@0.32.16
├── expo-constants@18.0.13
└── jest-expo@54.0.16
```

### 5.5 完全な実行スクリプト

```bash
#!/bin/bash
# cleanup-and-reinstall-v1.1.sh

set -e  # エラーで停止

echo "=== Expo SDK 54 依存関係修正スクリプト v1.1 ==="
echo ""

# 環境確認
echo "[0/10] Checking environment..."
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "  Node.js: $NODE_VERSION"
echo "  npm: $NPM_VERSION"

# バックアップ
echo "[1/10] Backing up package.json..."
cp package.json package.json.backup

echo "[2/10] Backing up package-lock.json..."
cp package-lock.json package-lock.json.backup 2>/dev/null || echo "  (no package-lock.json to backup)"

echo "[3/10] Recording current state..."
npm list --depth=0 > npm-list-before.txt 2>&1 || true

# クリーンアップ
echo "[4/10] Removing node_modules..."
rm -rf node_modules

echo "[5/10] Removing package-lock.json..."
rm -f package-lock.json

echo "[6/10] Cleaning npm cache..."
npm cache clean --force

# 再インストール
echo "[7/10] Reinstalling dependencies..."
npm install

# 検証
echo "[8/10] Verifying installation..."
npm list --depth=0 > npm-list-after.txt 2>&1 || true

echo "[9/10] Checking critical packages..."
npm list expo expo-router expo-sqlite expo-notifications expo-constants jest-expo --depth=0

echo "[10/10] Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Review npm-list-after.txt for any issues"
echo "  2. Run 'npm start' to start Expo"
echo "  3. Run 'npm test' to verify tests"
echo "  4. Check Section 6 of the implementation plan for detailed verification"
```

**スクリプトの実行:**
```bash
chmod +x cleanup-and-reinstall-v1.1.sh
./cleanup-and-reinstall-v1.1.sh
```

---

## 6. 検証計画

### 6.1 インストール検証

#### 6.1.1 バージョン確認

```bash
# 期待値チェック
npm list --depth=0 | grep -E "(expo|react-native|jest)"
```

**期待される出力:**
```
├── @expo/metro-runtime@6.1.2
├── expo@54.0.32
├── expo-constants@18.0.13
├── expo-linking@8.0.11
├── expo-notifications@0.32.16
├── expo-router@6.0.22
├── expo-sqlite@16.0.10
├── expo-status-bar@3.0.9
├── jest@29.7.0
├── jest-expo@54.0.16
├── react@19.1.0
├── react-native@0.81.5
├── react-native-safe-area-context@5.6.0
└── react-native-screens@4.16.0
```

#### 6.1.2 依存関係の整合性チェック

```bash
# エラーがないことを確認
npm list 2>&1 | grep -i "invalid\|error\|UNMET"
```

**期待される出力:** （何も表示されない = エラーなし）

#### 6.1.3 expo-constants の確認（v1.1で追加）

```bash
# expo-constants が正しくインストールされているか確認
npm list expo-constants
```

**期待される出力:**
```
one-day-os@1.0.0
└── expo-constants@18.0.13
```

### 6.2 起動検証

#### 6.2.1 Expo起動テスト

```bash
npm start
```

**成功条件:**
- ✅ 依存関係の警告メッセージが**表示されない**
- ✅ Metro Bundler が正常起動
- ✅ QRコードが表示される
- ✅ "Waiting on http://localhost:8081" が表示
- ✅ "Logs for your project will appear below" が表示

**失敗条件:**
- ❌ "The following packages should be updated..." の警告が表示される
- ❌ エラーで起動が中断される
- ❌ Metro Bundler が起動しない

#### 6.2.2 ビルド検証

```bash
# Metro Bundlerのログを確認
# 別のターミナルで以下を実行
curl http://localhost:8081/status

# 期待される出力: {"packager_status":"running"}
```

### 6.3 機能検証

#### 6.3.1 データベース（SQLite v16）

```bash
# データベース初期化テスト
npm test -- src/database/db.test.ts
```

**成功条件:**
- ✅ すべてのテストがパス
- ✅ SQLite接続が確立
- ✅ スキーマ作成が成功
- ✅ API変更によるエラーなし

**確認するAPI:**
- `openDatabaseAsync()` - データベース接続
- `execAsync()` - SQL実行
- `getFirstAsync()` - 単一行取得
- `runAsync()` - INSERT/UPDATE/DELETE

#### 6.3.2 ルーティング（Expo Router v6）

```bash
# ルーティングテスト
npm test -- src/ui/screens/onboarding/OnboardingFlow.test.tsx
```

**成功条件:**
- ✅ ルーティングが正常動作
- ✅ `useRouter()` フックが機能
- ✅ `router.replace()` が動作
- ✅ `router.back()` が動作

**確認するAPI:**
- `useRouter()` - ルーターフック
- `router.replace()` - 画面遷移
- `router.back()` - 戻る

#### 6.3.3 通知（Expo Notifications）

```bash
# 通知システムテスト
npm test -- src/notifications/NotificationScheduler.test.ts
```

**成功条件:**
- ✅ 通知スケジュール設定が成功
- ✅ 通知APIが正常動作
- ✅ パーミッション処理が正常

### 6.4 Jest設定の互換性検証（v1.1で追加）

#### 6.4.1 jest.config.js の確認

```bash
# 現在の Jest 設定を確認
cat jest.config.js
```

**確認ポイント:**
```javascript
module.exports = {
  preset: 'react-native',  // jest-expo v54 では 'jest-expo' も選択可能
  transformIgnorePatterns: [
    // expo-constants, expo-linking が含まれているか確認
    'node_modules/(?!(expo-sqlite|expo-modules-core|expo-asset|expo.*|react-native|@react-native|react-native-.*)/)',
  ],
  // ...
};
```

#### 6.4.2 Jest モックの確認

```bash
# モックファイルの存在確認
ls -la __mocks__/
```

**確認ポイント:**
- expo-router のモックが正しいか
- expo-sqlite のモックが v16 API に対応しているか

#### 6.4.3 全テストスイート実行

```bash
# 全テスト実行
npm test

# カバレッジ付き
npm test -- --coverage
```

**成功条件:**
- ✅ すべてのテストがパス
- ✅ カバレッジレポートが生成される
- ✅ エラーや警告がない
- ✅ タイムアウトエラーなし

### 6.5 追加検証項目（v1.1で追加）

#### 6.5.1 React Native 0.81 互換性確認

```bash
# React Native バージョン確認
npm list react-native

# Metro Bundler の動作確認（すでに npm start で確認済み）
```

**確認ポイント:**
- Metro Bundler が正常起動
- バンドルエラーがない
- iOS/Android向けビルドが開始できる

#### 6.5.2 Expo Go アプリバージョン確認

**iOS/Android実機での確認:**
1. Expo Go アプリを最新版に更新
2. QRコードをスキャン
3. アプリが正常に起動するか確認

**Expo Go の最小バージョン:**
- iOS: Expo Go 2.30.0 以上
- Android: Expo Go 2.30.0 以上

#### 6.5.3 TypeScript 互換性確認

```bash
# TypeScript バージョン確認
npm list typescript

# 型チェック実行
npx tsc --noEmit
```

**成功条件:**
- ✅ 型エラーがない
- ✅ 新しいパッケージの型定義が認識される

### 6.6 検証チェックリスト

| # | 検証項目 | 期待結果 | 確認方法 | 状態 |
|---|---------|---------|---------|------|
| 1 | package.json と node_modules が一致 | すべて一致 | `npm list --depth=0` | ⬜ |
| 2 | expo-constants が追加されている | v18.0.13 | `npm list expo-constants` | ⬜ |
| 3 | 依存関係の警告なし | 警告なし | `npm start` | ⬜ |
| 4 | Expo起動成功 | 起動成功 | `npm start` | ⬜ |
| 5 | SQLiteテスト成功 | すべてパス | `npm test db.test.ts` | ⬜ |
| 6 | ルーティングテスト成功 | すべてパス | `npm test OnboardingFlow.test.tsx` | ⬜ |
| 7 | 通知テスト成功 | すべてパス | `npm test NotificationScheduler.test.ts` | ⬜ |
| 8 | 全テストスイート成功 | すべてパス | `npm test` | ⬜ |
| 9 | Jest設定の互換性 | エラーなし | jest.config.js確認 | ⬜ |
| 10 | TypeScript型チェック | エラーなし | `npx tsc --noEmit` | ⬜ |
| 11 | iOSビルド準備成功 | ビルド開始 | `npm run ios` | ⬜ |
| 12 | Androidビルド準備成功 | ビルド開始 | `npm run android` | ⬜ |

---

## 7. ロールバック戦略

### 7.1 ロールバックが必要なケース

- npm install が繰り返し失敗する
- インストール後にExpoが起動しない
- 重大なバグが発生する
- テストが大量に失敗する（50%以上）
- API変更により既存コードが動作しない

### 7.2 ロールバック手順

```bash
# Step 1: 現在の状態を記録
cp package.json package.json.failed
npm list --depth=0 > npm-list-failed.txt 2>&1

# Step 2: バックアップから復元
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json 2>/dev/null || true

# Step 3: クリーンアップ
rm -rf node_modules
rm -f package-lock.json

# Step 4: 古いバージョンで再インストール
npm install

# Step 5: 確認
npm start
```

**所要時間:** 約5分

### 7.3 ロールバック後の対応

1. **問題の詳細な記録**
   - エラーメッセージの全文を保存
   - 実行ログを保存（npm-list-failed.txt）
   - スクリーンショット（エラー画面）

2. **代替アプローチの検討**

   **オプション A: 段階的アップグレード**
   ```bash
   # まず jest-expo だけ更新
   npm install jest-expo@~54.0.16
   npm test

   # 次に expo-router を更新
   npm install expo-router@~5.0.0  # v6の前のバージョン
   npm start
   ```

   **オプション B: legacy-peer-deps の使用**
   ```bash
   npm install --legacy-peer-deps
   ```

   **オプション C: Expo SDK 52へのダウングレード**
   ```bash
   # package.json で expo を ~52.0.0 に変更
   # すべての依存関係をSDK 52互換バージョンに変更
   npx expo install --fix
   ```

3. **コミュニティへの問い合わせ**
   - [Expo Forums](https://forums.expo.dev/)
   - [GitHub Issues - expo/expo](https://github.com/expo/expo/issues)
   - Stack Overflow（タグ: expo, react-native）

---

## 8. リスク分析

### 8.1 リスクマトリクス

| リスク | 発生確率 | 影響度 | 重要度 | 対策 |
|-------|---------|-------|-------|------|
| npm install 失敗 | 低 | 中 | 中 | ロールバック準備 |
| expo-router v6 API破壊的変更 | 高 | 高 | 高 | API移行ガイド作成（Section 9） |
| expo-sqlite v16 API破壊的変更 | 中 | 高 | 高 | API移行ガイド作成（Section 9） |
| テスト失敗 | 中 | 中 | 中 | Jest設定確認、修正計画 |
| ビルドエラー | 低 | 高 | 中 | ドキュメント確認 |
| React Native 0.81 破壊的変更 | 低 | 中 | 中 | リリースノート確認 |

### 8.2 主要リスクと対策

#### リスク #1: Expo Router v4 → v6 の破壊的変更

**発生確率:** 高
**影響度:** 高
**重要度:** 高

**潜在的な問題:**
- ファイルベースルーティングのAPI変更
- `useRouter()` フックの仕様変更
- ナビゲーションスタックの動作変更
- `router.replace()`, `router.back()` の動作変更

**対策:**
1. **事前調査:** Section 9.2 API移行ガイド参照
2. **コード監査:** すべての `useRouter()` 使用箇所をリスト化
3. **段階的修正:** 必要に応じてコード修正

**影響を受けるファイル:**
- `app/(tabs)/_layout.tsx`
- `app/onboarding/index.tsx`
- `src/ui/screens/onboarding/OnboardingFlow.tsx`

#### リスク #2: SQLite v15 → v16 のAPI変更

**発生確率:** 中
**影響度:** 高
**重要度:** 高

**潜在的な問題:**
- データベース接続APIの変更
- トランザクション処理の変更
- 型定義の変更
- `openDatabaseAsync()`, `execAsync()` 等のシグネチャ変更

**対策:**
1. **事前調査:** Section 9.1 API移行ガイド参照
2. **テスト強化:** データベース関連テストを優先実行
3. **マイグレーション:** 必要に応じてDB初期化ロジックを修正

**影響を受けるファイル:**
- `src/database/db.ts`
- `src/database/schema.ts`
- `src/core/identity/IdentityEngine.ts`
- すべての `*.test.ts` ファイル（SQLite使用箇所）

#### リスク #3: テストの失敗

**発生確率:** 中
**影響度:** 中
**重要度:** 中

**潜在的な問題:**
- jest-expo v52 → v54 でモックの動作変更
- React Native Testing Library の互換性
- タイムアウト設定の変更
- `transformIgnorePatterns` の調整が必要

**対策:**
1. **段階的テスト:** 小さな単位でテストを実行
2. **ログ分析:** 失敗したテストのログを詳細に確認
3. **Jest設定確認:** Section 6.4 参照
4. **修正計画:** 失敗が多数の場合は別途修正計画を作成

#### リスク #4: 通知システムの動作変更

**発生確率:** 低
**影響度:** 高
**重要度:** 中

**潜在的な問題:**
- 通知スケジュールAPIの変更
- パーミッション処理の変更
- 通知レスポンス処理の変更

**対策:**
1. **ドキュメント確認:** expo-notifications v0.32 の変更点を確認
2. **実機テスト:** iOS/Android実機での通知動作確認
3. **フォールバック:** 通知が動作しない場合の代替案を検討

#### リスク #5: React Native 0.76 → 0.81 の破壊的変更（v1.1で追加）

**発生確率:** 低
**影響度:** 中
**重要度:** 中

**潜在的な問題:**
- コアAPIの変更
- Metro Bundler の設定変更
- 新しいアーキテクチャの影響

**対策:**
1. **リリースノート確認:** Section 9.3 参照
2. **Metro Bundler 動作確認:** npm start で正常起動を確認
3. **段階的テスト:** まずは開発サーバー起動から確認

### 8.3 リスク軽減のためのベストプラクティス

1. **小さなステップで進める**
   - 一度にすべて変更せず、段階的に検証

2. **バックアップを常に保持**
   - package.json, package-lock.json のバックアップ（✅実装済み）

3. **Gitでバージョン管理**
   - 各ステップでコミット
   - 問題発生時に即座に revert

4. **ドキュメントを常に参照**
   - 公式ドキュメントの変更履歴を確認
   - コミュニティのディスカッションをチェック

5. **テストを信頼する**
   - テストが失敗したら、必ず原因を調査
   - テストをスキップしない

---

## 9. API移行ガイド（新規セクション）

### 9.1 Expo SQLite v15 → v16 API変更

#### 9.1.1 主要な変更点

**現在のコード（v15）:**
```typescript
// src/database/db.ts
import * as SQLite from 'expo-sqlite';

// データベース接続
const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

// SQL実行
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS identity (
    id INTEGER PRIMARY KEY,
    identity_health INTEGER NOT NULL
  );
`);

// 単一行取得
const row = await db.getFirstAsync<IdentityRow>(
  'SELECT * FROM identity WHERE id = ?',
  [1]
);

// INSERT/UPDATE/DELETE
await db.runAsync(
  'UPDATE identity SET identity_health = ? WHERE id = ?',
  [newIH, 1]
);
```

#### 9.1.2 v16での変更確認手順

```bash
# 1. インストール後、公式ドキュメントを確認
open https://docs.expo.dev/versions/latest/sdk/sqlite/

# 2. 型定義を確認
npx tsc --noEmit src/database/db.ts

# 3. テストを実行して動作確認
npm test -- src/database/db.test.ts --verbose
```

#### 9.1.3 想定される変更シナリオ

**シナリオ A: APIに変更なし（最良ケース）**
- 既存コードがそのまま動作
- 型定義のみ更新されている可能性

**シナリオ B: メソッド名変更**
```typescript
// 変更例（仮）
// Before: openDatabaseAsync()
// After:  openAsync() または open()

// コード修正が必要
```

**シナリオ C: 非同期処理の変更**
```typescript
// 変更例（仮）
// Before: async/await
// After:  Promise chaining または callback

// コード修正が必要
```

#### 9.1.4 修正が必要な場合の対応

1. **エラーメッセージを記録**
   ```bash
   npm test -- src/database/db.test.ts 2>&1 | tee sqlite-errors.log
   ```

2. **公式マイグレーションガイドを確認**
   - [expo-sqlite Migration Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)

3. **修正計画を作成**
   - 影響範囲を特定（全ファイルをリスト化）
   - 修正内容を決定
   - テストを更新

4. **段階的に修正**
   - まず `src/database/db.ts` を修正
   - テストがパスすることを確認
   - 他のファイルを順次修正

### 9.2 Expo Router v4 → v6 API変更

#### 9.2.1 主要な変更点

**現在のコード（v4）:**
```typescript
// src/ui/screens/onboarding/OnboardingFlow.tsx
import { useRouter } from 'expo-router';

const router = useRouter();

// 画面遷移
router.replace('/(tabs)');

// 戻る
router.back();
```

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

<Tabs>
  <Tabs.Screen name="index" />
  <Tabs.Screen name="morning" />
  <Tabs.Screen name="evening" />
</Tabs>
```

#### 9.2.2 v6での変更確認手順

```bash
# 1. 公式マイグレーションガイドを確認
open https://docs.expo.dev/router/migrate/from-v4/

# 2. 型定義を確認
npx tsc --noEmit src/ui/screens/onboarding/OnboardingFlow.tsx

# 3. テストを実行
npm test -- src/ui/screens/onboarding/OnboardingFlow.test.tsx --verbose
```

#### 9.2.3 想定される変更シナリオ

**シナリオ A: APIに変更なし（最良ケース）**
- 既存コードがそのまま動作
- 内部実装のみ変更

**シナリオ B: useRouter() の戻り値変更**
```typescript
// 変更例（仮）
// Before: router.replace('/(tabs)')
// After:  router.replace({ pathname: '/(tabs)' })

// コード修正が必要
```

**シナリオ C: Tabs/Stack コンポーネントのAPI変更**
```typescript
// 変更例（仮）
// Before: <Tabs.Screen name="index" />
// After:  <Tabs.Screen route="index" />

// コード修正が必要
```

#### 9.2.4 修正が必要な場合の対応

1. **影響範囲の特定**
   ```bash
   # useRouter() を使用している全ファイルを検索
   grep -r "useRouter" app/ src/ --include="*.tsx" --include="*.ts"

   # Tabs/Stack を使用している全ファイルを検索
   grep -r "from 'expo-router'" app/ --include="*.tsx"
   ```

2. **公式マイグレーションガイドを参照**
   - Breaking changes のセクションを確認
   - コード例を参考に修正

3. **修正優先順位**
   - 高: `src/ui/screens/onboarding/OnboardingFlow.tsx`
   - 高: `app/(tabs)/_layout.tsx`
   - 中: `app/_layout.tsx`

### 9.3 React Native 0.76 → 0.81 破壊的変更（v1.1で追加）

#### 9.3.1 確認手順

```bash
# 1. React Native リリースノートを確認
open https://github.com/facebook/react-native/releases

# 特に以下のバージョンをチェック：
# - v0.77: https://github.com/facebook/react-native/releases/tag/v0.77.0
# - v0.78: https://github.com/facebook/react-native/releases/tag/v0.78.0
# - v0.79: https://github.com/facebook/react-native/releases/tag/v0.79.0
# - v0.80: https://github.com/facebook/react-native/releases/tag/v0.80.0
# - v0.81: https://github.com/facebook/react-native/releases/tag/v0.81.0

# 2. TypeScript型チェック
npx tsc --noEmit

# 3. Metro Bundler 起動確認
npm start
```

#### 9.3.2 想定される影響

**一般的な変更（React Native メジャーアップグレード）:**
- コンポーネントAPIの変更（稀）
- Metro Bundler の設定変更（稀）
- 新しいアーキテクチャの機能追加（オプトイン）

**One Day OS での影響（予想）:**
- ✅ 影響なし（基本的なAPIのみ使用）
- View, Text, StyleSheet, Pressable 等は安定

#### 9.3.3 問題が発生した場合

```bash
# エラーログを記録
npm start 2>&1 | tee react-native-errors.log

# 問題の特定
# - Metro Bundler のエラーメッセージを確認
# - TypeScript エラーを確認
# - ランタイムエラーを確認
```

### 9.4 API移行チェックリスト

| API | バージョン | 確認方法 | 状態 | 修正必要 |
|-----|-----------|---------|------|---------|
| SQLite.openDatabaseAsync() | v15→v16 | テスト実行 | ⬜ | ⬜ |
| db.execAsync() | v15→v16 | テスト実行 | ⬜ | ⬜ |
| db.getFirstAsync() | v15→v16 | テスト実行 | ⬜ | ⬜ |
| db.runAsync() | v15→v16 | テスト実行 | ⬜ | ⬜ |
| useRouter() | v4→v6 | テスト実行 | ⬜ | ⬜ |
| router.replace() | v4→v6 | テスト実行 | ⬜ | ⬜ |
| router.back() | v4→v6 | テスト実行 | ⬜ | ⬜ |
| Tabs.Screen | v4→v6 | 起動確認 | ⬜ | ⬜ |
| Stack.Screen | v4→v6 | 起動確認 | ⬜ | ⬜ |
| React Native Core | 0.76→0.81 | 型チェック | ⬜ | ⬜ |

---

## 10. 付録

### 10.1 Expo SDK 54 互換性マトリクス

| パッケージ | SDK 52 | SDK 54 | 変更の種類 | 破壊的変更 |
|-----------|--------|--------|----------|----------|
| expo-router | ~4.0.0 | ~6.0.22 | メジャー | 高 |
| expo-sqlite | ~15.0.0 | ~16.0.10 | メジャー | 中 |
| expo-notifications | ~0.29.0 | ~0.32.16 | マイナー | 低 |
| react-native | 0.76.5 | 0.81.5 | マイナー | 低 |
| jest-expo | ~52.0.0 | ~54.0.16 | メジャー | 低 |
| expo-constants | - | ~18.0.13 | 新規追加 | - |
| expo-linking | - | ~8.0.11 | 新規追加 | - |

### 10.2 参考リンク

**公式ドキュメント:**
- [Expo SDK 54 リリースノート](https://blog.expo.dev/expo-sdk-54-is-now-available-5a3aef5a4abc)
- [Expo Router v6 Migration Guide](https://docs.expo.dev/router/migrate/from-v4/)
- [expo-sqlite v16 Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native 0.81 Release Notes](https://github.com/facebook/react-native/releases/tag/v0.81.0)

**コミュニティ:**
- [Expo Forums](https://forums.expo.dev/)
- [Expo Discord](https://discord.gg/expo)
- [GitHub - expo/expo](https://github.com/expo/expo)
- [Stack Overflow - expo tag](https://stackoverflow.com/questions/tagged/expo)

### 10.3 環境情報

**開発環境:**
- Node.js: 18.x 以上（推奨: 18.17.0+）
- npm: 9.x 以上（推奨: 9.6.7+）
- macOS: Darwin 25.3.0
- Expo CLI: 最新版（expo packageに含まれる）

**推奨ツール:**
- Expo Go アプリ（iOS/Android）- バージョン 2.30.0+
- Xcode（iOS開発の場合）- 最新版
- Android Studio（Android開発の場合）- 最新版

### 10.4 トラブルシューティング

#### 問題 #1: npm install が失敗する

**エラー例:**
```
npm error ERESOLVE could not resolve
```

**解決策:**
```bash
# オプション 1: キャッシュを完全クリア
rm -rf ~/.npm
npm cache clean --force
npm install

# オプション 2: legacy-peer-deps を使用
npm install --legacy-peer-deps

# オプション 3: ロールバック（Section 7）
```

#### 問題 #2: Expo起動時に警告が消えない

**原因:**
- node_modules が正しくインストールされていない

**解決策:**
```bash
# 再度クリーンインストール
rm -rf node_modules
rm package-lock.json
npm install
```

#### 問題 #3: テストが大量に失敗する

**原因:**
- API変更によるコード修正が必要
- Jest設定が古い

**解決策:**
```bash
# 1. 失敗したテストのログを確認
npm test -- --verbose > test-failures.log 2>&1

# 2. Section 9（API移行ガイド）を参照

# 3. 修正計画を作成
```

### 10.5 実装後の報告テンプレート

```markdown
## Expo SDK 54 依存関係修正 実装報告

**実施日:** YYYY-MM-DD
**実施者:** [名前]
**所要時間:** [時間]

### 実施結果

- [ ] npm install 成功
- [ ] 依存関係の警告なし
- [ ] Expo起動成功
- [ ] 全テスト成功
- [ ] API変更の影響なし

### 検証結果

| 項目 | 結果 | 備考 |
|------|------|------|
| バージョン確認 | ✅/❌ | |
| Expo起動 | ✅/❌ | |
| SQLiteテスト | ✅/❌ | |
| ルーティングテスト | ✅/❌ | |
| 全テスト | ✅/❌ | |

### 問題と対応

**発生した問題:**
- [問題の説明]

**対応内容:**
- [対応の説明]

### 次のアクション

- [ ] [アクション項目]
```

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|-----------|------|---------|-------|
| v1.0 | 2026-01-28 | 初版作成 | Claude Sonnet 4.5 |
| v1.1 | 2026-01-28 | Opusレビュー反映版 | Claude Sonnet 4.5 |

**v1.1 での主な変更:**
- ✅ package.json の jest-expo バージョン修正
- ✅ expo-constants, expo-linking, @expo/metro-runtime を追加
- ✅ package-lock.json のバックアップ手順を追加
- ✅ Section 9「API移行ガイド」を新規追加
- ✅ Jest設定の互換性検証を追加
- ✅ React Native 0.81 の破壊的変更確認を追加
- ✅ Node.js/Expo Goバージョン確認を追加
- ✅ 検証チェックリストを12項目に拡張

---

## 12. レビュー・承認

### 12.1 レビュー結果

**v1.0 レビュー（Opus）:**
- 評価: NEEDS REVISION
- Critical問題: 3件 → ✅ すべて修正済み
- High問題: 4件 → ✅ すべて修正済み
- Medium/Low問題: 3件 → ✅ すべて対応済み

**v1.1 レビュー:**
- 待機中

### 12.2 承認

| 役割 | 名前 | 日付 | 承認 |
|-----|------|------|------|
| 計画作成（v1.0） | Claude Sonnet 4.5 | 2026-01-28 | ✅ |
| レビュー（v1.0） | Claude Opus 4.5 | 2026-01-28 | ⚠️ 要修正 |
| 計画修正（v1.1） | Claude Sonnet 4.5 | 2026-01-28 | ✅ |
| レビュー（v1.1） | - | - | ⬜ |
| 承認（ユーザー） | - | - | ⬜ |

---

**次のステップ:**

1. **v1.1 のレビュー**（推奨: Claude Opus での再レビュー）
2. レビュー結果に基づく最終調整（必要に応じて）
3. ユーザー承認
4. 実装実行

---

*One Day OS - 人生強制執行システム*
*Co-Authored by: Claude Sonnet 4.5 <noreply@anthropic.com>*
