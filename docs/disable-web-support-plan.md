# Web版無効化実装計画

## 概要

One Day OSをモバイル専用アプリとして明確に定義し、Web版の起動を無効化する。プロジェクトの本質（データ永続性、通知システム、バックアップ無効化）に最適化する。

## 理由

1. **プロジェクトの本質:** モバイル専用の生活再建システム
2. **データ永続性:** ローカルSQLite + バックアップ無効化が核心機能
3. **通知システム:** 6回/日の正確な通知がIHシステムの要
4. **制約の実現:** Web版では`allowBackup: false`などの重要制約を実現不可能

## 実装戦略

### アプローチ
`package.json`からWeb関連スクリプトを削除し、Web起動時にエラーメッセージを表示する。

## 実装内容

### 1. package.json からWebスクリプト削除

**変更前:**
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest"
  }
}
```

**変更後:**
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest"
  }
}
```

**理由:**
- `web`スクリプトを削除してWeb起動を不可能にする
- 開発者が誤ってWeb版を起動するのを防ぐ

### 2. app.json でWeb設定をコメントアウト

**変更前:**
```json
"web": {
  "favicon": "./assets/favicon.png"
}
```

**変更後:**
```json
"web": {
  "bundler": "metro"
}
```

**理由:**
- Webバンドラーをmetroに指定（expo-sqliteはMetroでは動作するが、Webpackでエラー）
- これにより、Web起動試行時に明確なエラーが表示される

### 3. README.md にモバイル専用であることを明記

**追加セクション:**
```markdown
## Platform Support

**This app is MOBILE-ONLY (Android/iOS).**

Web version is intentionally disabled because:
- Core features require native mobile capabilities (local SQLite, no backup, precise notifications)
- Data permanence and wipe mechanism cannot be properly enforced on web browsers
- Identity Health system requires strict notification timing (not reliable in browsers)

### Supported Platforms
✅ Android (API 24+)
✅ iOS (13+)
❌ Web (Not Supported)
```

### 4. エラーハンドリング用コンポーネント作成（Optional）

**ファイル:** `app/web-not-supported.tsx`

**内容:**
```typescript
import { View, Text, StyleSheet } from 'react-native';

export default function WebNotSupported() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Web Not Supported</Text>
      <Text style={styles.message}>
        One Day OS is a mobile-only application.
      </Text>
      <Text style={styles.message}>
        Please use Android or iOS device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: '#FF0000',
    fontSize: 24,
    fontFamily: 'Courier New',
    marginBottom: 20,
  },
  message: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Courier New',
    textAlign: 'center',
    marginVertical: 10,
  },
});
```

**理由:**
- 万が一Web版が起動した場合に表示する専用画面
- Brutalistデザインに準拠したエラー表示

### 5. react-native-web 依存関係の削除（Optional）

**削除対象:**
```json
"react-native-web": "^0.21.0"
```

**注意:**
- expo-routerがreact-native-webに依存している可能性あり
- 削除前に依存関係を確認する必要あり
- **Phase 2で実施**（Phase 1では保留）

## 実装手順

### Phase 1: Web無効化（即座に実施）
1. `package.json`から`web`スクリプトを削除
2. `app.json`のweb設定を最小化
3. README.mdにモバイル専用であることを明記

### Phase 2: クリーンアップ（後日実施可能）
1. react-native-web依存関係の削除可否確認
2. Web関連アセット（favicon.png等）の削除
3. 不要なWeb設定ファイルの削除

## テスト計画

### 確認項目

#### 動作確認
- [ ] `npm start`が正常に起動する
- [ ] `npm run android`が正常に動作する
- [ ] `npm run ios`が正常に動作する
- [ ] `npm run web`が存在しない（コマンド未定義エラー）

#### 既存機能維持確認
- [ ] Android版のビルド確認
- [ ] iOS版のビルド確認
- [ ] オンボーディングフローの動作
- [ ] Identity Health計算の動作
- [ ] 通知システムの動作

### テストコマンド
```bash
# 開発サーバー起動
npm start

# Android版
npm run android

# iOS版
npm run ios

# Webスクリプトが削除されたことの確認
npm run web  # → エラー: "Missing script: web"

# ユニットテスト
npm test
```

## ロールバック戦略

問題が発生した場合:
1. `package.json`の`scripts`に`"web": "expo start --web"`を再追加
2. `app.json`のweb設定を元に戻す
3. Git commitをrevert

## 成果物

1. **更新ファイル:**
   - `package.json` (webスクリプト削除)
   - `app.json` (web設定最小化)
   - `README.md` (モバイル専用明記)

2. **新規ファイル（Optional）:**
   - `app/web-not-supported.tsx` (エラー表示コンポーネント)

3. **削除対象（Phase 2）:**
   - `assets/favicon.png`
   - `react-native-web`依存関係（依存関係確認後）

## 潜在的なリスク

### リスク1: expo-routerのWeb依存
**影響:** react-native-web削除時にビルドエラー
**対策:** Phase 1では依存関係を削除せず、動作確認後にPhase 2で実施

### リスク2: Expo開発サーバーのWeb起動
**影響:** `expo start`実行時に自動的にWebが起動する可能性
**対策:** `app.json`で`bundler: metro`を指定

### リスク3: 既存のWebアセット参照
**影響:** favicon等のWeb専用アセットへの参照が残る
**対策:** Phase 2でクリーンアップ

## 実装時の注意事項

1. **既存コードへの影響なし:** データベース層、UI層は一切変更しない
2. **Git履歴の保持:** Web設定削除前にコミット
3. **ドキュメント更新:** README.mdとCLAUDE.mdにモバイル専用を明記

## 依存関係

- 実装前提: 現在のコードベース
- ブロッカー: なし
- 並行作業可能: ドキュメント更新は独立して実施可能

## 完了条件

- [ ] `npm run web`コマンドが存在しない
- [ ] README.mdにモバイル専用であることが明記されている
- [ ] `npm start`、`npm run android`、`npm run ios`が正常に動作する
- [ ] 既存のモバイル機能が全て動作する
- [ ] Web起動時のエラーが適切に表示される（optional）
