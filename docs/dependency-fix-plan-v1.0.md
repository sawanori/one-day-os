# Expo SDK 54 依存関係修正 実装計画書 v1.0

**作成日:** 2026-01-28
**ステータス:** レビュー待ち
**優先度:** Critical

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

- **Expo Router (v4 → v6)**: ファイルベースルーティングの動作に影響
- **Expo SQLite (v15 → v16)**: データベースAPIの互換性問題
- **Expo Notifications (v0.29 → v0.32)**: 通知システムの動作不良
- **jest-expo (v52 → v54)**: テストの実行失敗の可能性

### 1.3 緊急度

**Critical** - アプリの起動と正常動作に直接影響

---

## 2. 現状分析

### 2.1 package.json vs 実際のインストール状態

| パッケージ | package.json | node_modules | 期待値 | 状態 |
|-----------|-------------|--------------|--------|------|
| expo | ~54.0.32 | 54.0.32 | ~54.0.32 | ✅ OK |
| expo-notifications | ~0.32.16 | 0.29.14 | ~0.32.16 | ❌ NG |
| expo-router | ~6.0.22 | 4.0.22 | ~6.0.22 | ❌ NG |
| expo-sqlite | ~16.0.10 | 15.0.6 | ~16.0.10 | ❌ NG |
| react-native-safe-area-context | ~5.6.0 | 4.12.0 | ~5.6.0 | ❌ NG |
| react-native-screens | ~4.16.0 | 4.3.0 | ~4.16.0 | ❌ NG |
| jest-expo | ~54.0.16 | 52.0.6 | ~54.0.16 | ❌ NG |

### 2.2 依存関係の状態

```bash
# npm list の実行結果
npm error invalid: expo-notifications@0.29.14
npm error invalid: expo-router@4.0.22
npm error invalid: expo-sqlite@15.0.6
```

**診断:** package.jsonは正しいが、node_modulesとpackage-lock.jsonに古いバージョンの情報が残存。

---

## 3. 根本原因

### 3.1 原因の特定

1. **package.json更新後の不完全なインストール**
   - package.jsonのバージョンが更新されたが、`npm install`が正常完了していない
   - package-lock.jsonに古いバージョンの解決情報が残存

2. **依存関係の競合**
   - expo-router v6 は expo-constants@^18.0.13 を要求
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

### 4.2 なぜこのアプローチか

| アプローチ | メリット | デメリット | 採用 |
|-----------|---------|-----------|------|
| `npm update` | 簡単 | 競合解決できない | ❌ |
| `npm install --force` | 強制インストール | 不整合が残る可能性 | ❌ |
| `npm install --legacy-peer-deps` | ピア依存無視 | 実行時エラーの危険 | ❌ |
| **クリーンインストール** | **完全解決** | **時間がかかる** | ✅ |

### 4.3 期待される結果

- すべてのパッケージがExpo SDK 54互換バージョンになる
- 依存関係の競合が完全解消
- Expo起動時の警告が消える
- アプリが正常起動する

---

## 5. 実装手順

### 5.1 事前準備（バックアップ）

```bash
# 1. package.json のバックアップ
cp package.json package.json.backup

# 2. 現在のインストール状態を記録
npm list --depth=0 > npm-list-before.txt

# 3. Gitで変更を確認（必要に応じてコミット）
git status
```

### 5.2 クリーンアップ手順

```bash
# Step 1: node_modules を完全削除
rm -rf node_modules

# Step 2: package-lock.json を削除
rm package-lock.json

# Step 3: npm キャッシュをクリア
npm cache clean --force

# Step 4: （オプション）グローバルキャッシュもクリア
rm -rf ~/.npm/_cacache
```

**所要時間:** 約1-2分

### 5.3 再インストール手順

```bash
# Step 5: 依存関係を再インストール
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

### 5.4 検証手順（詳細は第6章）

```bash
# Step 6: インストール状態を確認
npm list expo expo-router expo-sqlite expo-notifications --depth=0

# Step 7: Expo起動テスト
npm start
```

### 5.5 完全な実行スクリプト

```bash
#!/bin/bash
# cleanup-and-reinstall.sh

echo "=== Expo SDK 54 依存関係修正スクリプト ==="
echo ""

# バックアップ
echo "[1/7] Backing up package.json..."
cp package.json package.json.backup
npm list --depth=0 > npm-list-before.txt

# クリーンアップ
echo "[2/7] Removing node_modules..."
rm -rf node_modules

echo "[3/7] Removing package-lock.json..."
rm package-lock.json

echo "[4/7] Cleaning npm cache..."
npm cache clean --force

# 再インストール
echo "[5/7] Reinstalling dependencies..."
npm install

# 検証
echo "[6/7] Verifying installation..."
npm list expo expo-router expo-sqlite expo-notifications --depth=0

echo "[7/7] Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'npm start' to start Expo"
echo "  2. Run 'npm test' to verify tests"
```

---

## 6. 検証計画

### 6.1 インストール検証

#### 6.1.1 バージョン確認

```bash
# 期待値チェック
npm list --depth=0 | grep -E "(expo|react-native)"
```

**期待される出力:**
```
├── expo@54.0.32
├── expo-notifications@0.32.16
├── expo-router@6.0.22
├── expo-sqlite@16.0.10
├── expo-status-bar@3.0.9
├── react@19.1.0
├── react-native@0.81.5
├── react-native-safe-area-context@5.6.0
└── react-native-screens@4.16.0
```

#### 6.1.2 依存関係の整合性チェック

```bash
# エラーがないことを確認
npm list 2>&1 | grep -i "invalid\|error"
```

**期待される出力:** （何も表示されない）

### 6.2 起動検証

#### 6.2.1 Expo起動テスト

```bash
npm start
```

**成功条件:**
- ✅ 警告メッセージが表示されない
- ✅ Metro Bundler が正常起動
- ✅ QRコードが表示される
- ✅ "Waiting on http://localhost:8081" が表示

**失敗条件:**
- ❌ 依存関係の警告が表示される
- ❌ エラーで起動が中断される

#### 6.2.2 ビルド検証

```bash
# iOS向けビルド準備
npm run ios -- --no-install

# Android向けビルド準備
npm run android -- --no-install
```

**成功条件:**
- ✅ ビルドプロセスが開始される
- ✅ Metro Bundler がバンドルを生成

### 6.3 機能検証

#### 6.3.1 データベース（SQLite）

```bash
# データベース初期化テスト
npm test -- src/database/db.test.ts
```

**成功条件:**
- ✅ すべてのテストがパス
- ✅ SQLite接続が確立
- ✅ スキーマ作成が成功

#### 6.3.2 ルーティング（Expo Router）

```bash
# ルーティングテスト
npm test -- src/ui/screens/onboarding/OnboardingFlow.test.tsx
```

**成功条件:**
- ✅ ルーティングが正常動作
- ✅ useRouter フックが機能

#### 6.3.3 通知（Expo Notifications）

```bash
# 通知システムテスト
npm test -- src/notifications/NotificationScheduler.test.ts
```

**成功条件:**
- ✅ 通知スケジュール設定が成功
- ✅ 通知APIが正常動作

### 6.4 テストスイート全体

```bash
# 全テスト実行
npm test
```

**成功条件:**
- ✅ すべてのテストがパス
- ✅ カバレッジレポートが生成される
- ✅ エラーや警告がない

### 6.5 検証チェックリスト

| # | 検証項目 | 期待結果 | 確認方法 | 状態 |
|---|---------|---------|---------|------|
| 1 | package.json と node_modules が一致 | すべて一致 | `npm list --depth=0` | ⬜ |
| 2 | 依存関係の警告なし | 警告なし | `npm start` | ⬜ |
| 3 | Expo起動成功 | 起動成功 | `npm start` | ⬜ |
| 4 | SQLiteテスト成功 | すべてパス | `npm test db.test.ts` | ⬜ |
| 5 | ルーティングテスト成功 | すべてパス | `npm test OnboardingFlow.test.tsx` | ⬜ |
| 6 | 通知テスト成功 | すべてパス | `npm test NotificationScheduler.test.ts` | ⬜ |
| 7 | 全テストスイート成功 | すべてパス | `npm test` | ⬜ |
| 8 | iOSビルド準備成功 | ビルド開始 | `npm run ios` | ⬜ |
| 9 | Androidビルド準備成功 | ビルド開始 | `npm run android` | ⬜ |

---

## 7. ロールバック戦略

### 7.1 ロールバックが必要なケース

- npm install が失敗し続ける
- インストール後にExpoが起動しない
- 重大なバグが発生する
- テストが大量に失敗する

### 7.2 ロールバック手順

```bash
# Step 1: バックアップから復元
cp package.json.backup package.json

# Step 2: 古い状態を再現
rm -rf node_modules
rm package-lock.json

# Step 3: 古いバージョンで再インストール
npm install

# Step 4: 確認
npm start
```

### 7.3 ロールバック後の対応

1. **問題の詳細な記録**
   - エラーメッセージの全文
   - 実行ログ
   - システム環境情報

2. **代替アプローチの検討**
   - `--legacy-peer-deps` オプションの使用
   - 段階的なアップグレード（v5 → v6）
   - Expo SDK 52へのダウングレード

3. **コミュニティへの問い合わせ**
   - Expo Forums
   - GitHub Issues（expo/expo リポジトリ）

---

## 8. リスク分析

### 8.1 リスクマトリクス

| リスク | 発生確率 | 影響度 | 重要度 | 対策 |
|-------|---------|-------|-------|------|
| npm install 失敗 | 低 | 中 | 中 | ロールバック準備 |
| API破壊的変更 | 中 | 高 | 高 | 事前調査、テスト |
| テスト失敗 | 中 | 中 | 中 | 修正計画を別途作成 |
| ビルドエラー | 低 | 高 | 中 | ドキュメント確認 |
| データベース互換性 | 低 | 高 | 中 | マイグレーション準備 |

### 8.2 主要リスクと対策

#### リスク #1: Expo Router v4 → v6 の破壊的変更

**発生確率:** 中
**影響度:** 高
**重要度:** 高

**潜在的な問題:**
- ファイルベースルーティングのAPI変更
- `useRouter()` フックの仕様変更
- ナビゲーションスタックの動作変更

**対策:**
1. **事前調査:** [Expo Router v6 リリースノート](https://docs.expo.dev/router/migrate/from-v4/)を確認
2. **コード監査:** すべての `useRouter()` 使用箇所をリスト化
3. **段階的修正:** 必要に応じてコード修正計画を別途作成

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

**対策:**
1. **事前調査:** [expo-sqlite v16 変更履歴](https://docs.expo.dev/versions/latest/sdk/sqlite/)を確認
2. **テスト強化:** データベース関連テストを優先実行
3. **マイグレーション:** 必要に応じてDB初期化ロジックを修正

**影響を受けるファイル:**
- `src/database/db.ts`
- `src/database/schema.ts`
- `src/core/identity/IdentityEngine.ts`

#### リスク #3: テストの失敗

**発生確率:** 中
**影響度:** 中
**重要度:** 中

**潜在的な問題:**
- jest-expo v52 → v54 でモックの動作変更
- React Native Testing Library の互換性
- タイムアウト設定の変更

**対策:**
1. **段階的テスト:** 小さな単位でテストを実行
2. **ログ分析:** 失敗したテストのログを詳細に確認
3. **修正計画:** 失敗が多数の場合は別途修正計画を作成

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

### 8.3 リスク軽減のためのベストプラクティス

1. **小さなステップで進める**
   - 一度にすべて変更せず、段階的に検証

2. **バックアップを常に保持**
   - package.json, package-lock.json, node_modules のバックアップ

3. **Gitでバージョン管理**
   - 各ステップでコミット
   - 問題発生時に即座に revert

4. **ドキュメントを常に参照**
   - 公式ドキュメントの変更履歴を確認
   - コミュニティのディスカッションをチェック

---

## 9. 実装後の確認事項

### 9.1 即時確認（実装直後）

- [ ] npm install がエラーなく完了
- [ ] npm list で依存関係エラーなし
- [ ] npm start で警告メッセージなし
- [ ] Metro Bundler が起動
- [ ] QRコードが表示される

### 9.2 機能確認（1時間以内）

- [ ] SQLite データベース初期化成功
- [ ] オンボーディングフロー表示
- [ ] ルーティング動作確認
- [ ] すべてのユニットテストがパス

### 9.3 詳細確認（24時間以内）

- [ ] iOS/Android実機での動作確認
- [ ] 通知システムの動作確認
- [ ] データベースCRUD操作の確認
- [ ] E2Eテストの実行

### 9.4 長期確認（1週間以内）

- [ ] 開発中の安定性確認
- [ ] パフォーマンス問題なし
- [ ] 新しい機能の追加がスムーズ
- [ ] チームメンバーの環境でも動作

---

## 10. 付録

### 10.1 Expo SDK 54 互換性マトリクス

| パッケージ | SDK 52 | SDK 54 | 変更の種類 |
|-----------|--------|--------|----------|
| expo-router | ~4.0.0 | ~6.0.22 | メジャーアップグレード |
| expo-sqlite | ~15.0.0 | ~16.0.10 | メジャーアップグレード |
| expo-notifications | ~0.29.0 | ~0.32.16 | マイナーアップグレード |
| react-native | 0.76.5 | 0.81.5 | マイナーアップグレード |
| jest-expo | ~52.0.0 | ~54.0.16 | メジャーアップグレード |

### 10.2 参考リンク

- [Expo SDK 54 リリースノート](https://blog.expo.dev/expo-sdk-54-is-now-available-5a3aef5a4abc)
- [Expo Router Migration Guide](https://docs.expo.dev/router/migrate/from-v4/)
- [expo-sqlite v16 Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native 0.81 Release Notes](https://github.com/facebook/react-native/releases/tag/v0.81.0)

### 10.3 環境情報

**開発環境:**
- Node.js: 18+
- npm: 最新版推奨
- macOS: Darwin 25.3.0
- Expo CLI: 最新版（expo packageに含まれる）

**推奨ツール:**
- Expo Go アプリ（iOS/Android）
- Xcode（iOS開発の場合）
- Android Studio（Android開発の場合）

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 作成者 |
|-----------|------|---------|-------|
| v1.0 | 2026-01-28 | 初版作成 | Claude Sonnet 4.5 |

---

## 12. レビュー・承認

### 12.1 レビューチェックリスト

- [ ] すべての依存関係の不一致が特定されている
- [ ] 解決策が明確で実行可能
- [ ] リスクが適切に評価されている
- [ ] ロールバック戦略が準備されている
- [ ] 検証計画が包括的
- [ ] ドキュメントが完全

### 12.2 承認

| 役割 | 名前 | 日付 | 承認 |
|-----|------|------|------|
| 計画作成 | Claude Sonnet 4.5 | 2026-01-28 | ✅ |
| レビュー（Opus） | - | - | ⬜ |
| 承認（ユーザー） | - | - | ⬜ |

---

**次のステップ:**

1. **この計画書のレビュー**（推奨: Claude Opus でのレビュー）
2. レビュー結果に基づく修正
3. ユーザー承認
4. 実装実行

---

*One Day OS - 人生強制執行システム*
*Co-Authored by: Claude Sonnet 4.5 <noreply@anthropic.com>*
