# Web版無効化実装計画 v2（レビュー反映版）

## 概要

One Day OSをモバイル専用アプリとして明確に定義し、Web版の起動を無効化する。プロジェクトの本質（データ永続性、通知システム、バックアップ無効化）に最適化する。

## 理由

1. **プロジェクトの本質:** モバイル専用の生活再建システム
2. **データ永続性:** ローカルSQLite + バックアップ無効化が核心機能
3. **通知システム:** 6回/日の正確な通知がIHシステムの要
4. **制約の実現:** Web版では`allowBackup: false`などの重要制約を実現不可能

## 実装戦略

### アプローチ
1. `app.json`で`platforms`を明示的に指定してWeb無効化
2. `package.json`からWebスクリプトを削除
3. ランタイムでのPlatform検出を追加（多層防御）
4. ドキュメント更新

## 実装内容

### 1. app.json でプラットフォーム制限【最重要】

**追加箇所:** `expo`オブジェクトのトップレベル

**追加内容:**
```json
{
  "expo": {
    "name": "One Day OS",
    "platforms": ["ios", "android"],
    ...
  }
}
```

**理由:**
- Expo SDK 54の正式な方法でWebプラットフォームを無効化
- ビルド時にWebが除外される
- `expo start`時に`w`キーを押してもWebが起動しない

**変更後のweb設定:**
```json
"web": {
  "favicon": "./assets/favicon.png"
}
```

**注意:** web設定は残す（将来の拡張性のため）が、`platforms`で除外されるため実際には使用されない

---

### 2. package.json からWebスクリプト削除

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
- 開発者が誤って`npm run web`を実行するのを防ぐ
- Web起動コマンドの明示的な削除

**重要:** `react-native-web`と`react-dom`は**削除しない**

**理由:**
- expo-router@6.0.22が両方をpeer dependencyとして要求
- 削除するとモバイルビルドも失敗する
- インストールされていてもWeb実行を防げば問題なし

---

### 3. ランタイムでのPlatform検出追加

**ファイル:** `app/_layout.tsx`

**追加コード（ファイルの最上部）:**
```typescript
import { Platform, View, Text, StyleSheet } from 'react-native';

// Web platform check - Block web execution
if (Platform.OS === 'web') {
  const WebNotSupported = () => (
    <View style={webBlockStyles.container}>
      <Text style={webBlockStyles.title}>⚠️ WEB NOT SUPPORTED</Text>
      <Text style={webBlockStyles.message}>
        One Day OS is a mobile-only application.
      </Text>
      <Text style={webBlockStyles.message}>
        Please use Android or iOS device.
      </Text>
      <Text style={webBlockStyles.reason}>
        Core features (local SQLite, no backup, precise notifications)
        require native mobile capabilities.
      </Text>
    </View>
  );

  const webBlockStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000000',
      padding: 20,
    },
    title: {
      color: '#FF0000',
      fontSize: 24,
      fontFamily: 'Courier New',
      marginBottom: 20,
      textAlign: 'center',
    },
    message: {
      color: '#FFFFFF',
      fontSize: 16,
      fontFamily: 'Courier New',
      textAlign: 'center',
      marginVertical: 10,
    },
    reason: {
      color: '#808080',
      fontSize: 12,
      fontFamily: 'Courier New',
      textAlign: 'center',
      marginTop: 30,
      maxWidth: 600,
    },
  });

  // Replace default export with error screen
  export default WebNotSupported;
  throw new Error('Web platform is not supported for One Day OS');
}

// Existing _layout.tsx code continues below...
```

**理由:**
- `app.json`の`platforms`設定を回避する試みをブロック
- ブラウザで直接アクセスした場合の多層防御
- Brutalistデザインに準拠したエラー表示

---

### 4. README.md 更新

**追加セクション（既存のDevelopment Commandsの後）:**
```markdown
### Platform Support

**⚠️ THIS APP IS MOBILE-ONLY (Android/iOS) ⚠️**

Web version is intentionally disabled because:
- Core features require native mobile capabilities (local SQLite, no backup, precise notifications)
- Data permanence and wipe mechanism cannot be properly enforced on web browsers
- Identity Health system requires strict notification timing (not reliable in browsers)

#### Supported Platforms
✅ **Android** (API 24+)
✅ **iOS** (13+)
❌ **Web** (Not Supported)

#### Important Notes
- Do NOT run `npm run web` (command removed)
- Do NOT press `w` during `expo start` (web disabled in app.json)
- `react-native-web` remains installed as a dependency (required by expo-router)
```

---

### 5. CLAUDE.md 更新

**追加箇所:** Development Commandsセクションの下

**追加内容:**
```markdown
### Platform Support

**MOBILE-ONLY (Android/iOS)**

Web version is disabled via:
- `"platforms": ["ios", "android"]` in app.json
- Platform detection in app/_layout.tsx
- Removed `npm run web` script

**Do not attempt to run web version:**
- Do not use `npm run web`
- Do not press `w` during expo start
- `react-native-web` remains installed (expo-router dependency)
```

---

### 6. 依存関係の保持（重要）

**保持する依存関係:**
```json
{
  "dependencies": {
    "react-native-web": "^0.21.0"
  },
  "overrides": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

**理由:**
- `expo-router@6.0.22`が`react-native-web`と`react-dom`をpeer dependencyとして要求
- これらを削除するとnpm installが失敗
- インストール状態でもWeb実行を防げるため問題なし

**Phase 2での削除は実施しない**

---

## 実装手順

### Phase 1: Web無効化（即座に実施）

**順序に注意:**

1. **app.json更新**
   - `"platforms": ["ios", "android"]`を追加

2. **package.json更新**
   - `"web": "expo start --web"`スクリプトを削除
   - `react-native-web`と`react-dom`は**保持**

3. **app/_layout.tsx更新**
   - Platform検出コードを追加（ファイル最上部）

4. **README.md更新**
   - Platform Supportセクションを追加

5. **CLAUDE.md更新**
   - Platform Supportセクションを追加

6. **動作確認**
   - `npm start`実行後、`w`を押してWebが起動しないことを確認
   - `npm run web`がエラーになることを確認

### Phase 2: クリーンアップ（後日実施可能、Optional）

**順序に注意:**

1. **app.jsonからweb設定を削除**（optional）
   ```json
   // これを削除
   "web": {
     "favicon": "./assets/favicon.png"
   }
   ```

2. **assets/favicon.png削除**（上記削除後のみ）
   ```bash
   rm assets/favicon.png
   ```

**重要:** Phase 2は必須ではない。設定が残っていても`platforms`で除外されるため問題なし。

---

## テスト計画

### Phase 1完了後の確認項目

#### Web無効化の確認
- [ ] `npm run web`を実行 → エラー: "Missing script: web"
- [ ] `npm start`実行後、`w`キーを押す → Web起動しない（または即座にエラー）
- [ ] ブラウザで直接アクセス試行 → "WEB NOT SUPPORTED"画面表示

#### Android動作確認
- [ ] `npm run android`が正常に起動
- [ ] オンボーディングフローが動作
- [ ] Identity Health計算が動作
- [ ] 通知システムが動作
- [ ] Quest完了が動作

#### iOS動作確認
- [ ] `npm run ios`が正常に起動
- [ ] オンボーディングフローが動作
- [ ] Identity Health計算が動作
- [ ] 通知システムが動作
- [ ] Quest完了が動作

#### ユニットテスト検証
- [ ] `npm test`が全てパスする
- [ ] `Platform.select`使用箇所（theme.ts等）がテストで正常動作
- [ ] 既存テストが全て成功

#### ビルド確認
- [ ] `eas build --platform android`が成功（EAS Build使用時）
- [ ] `eas build --platform ios`が成功（EAS Build使用時）

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

# 全ユニットテスト
npm test

# 特定のテストファイル
npm test -- src/ui/theme/theme.test.ts
```

---

## ロールバック戦略

問題が発生した場合は、Gitで一括revertが最も安全:

```bash
# 全変更を一括で元に戻す
git revert <commit-hash>
```

**個別ロールバック手順（必要な場合）:**

1. **app.json**
   - `"platforms": ["ios", "android"]`を削除

2. **package.json**
   - `"web": "expo start --web"`を`scripts`に再追加

3. **app/_layout.tsx**
   - Platform検出コードを削除

4. **README.md**
   - Platform Supportセクションを削除

5. **CLAUDE.md**
   - Platform Supportセクションを削除

---

## 成果物

### Phase 1

**更新ファイル:**
- `app.json` (`platforms`追加)
- `package.json` (webスクリプト削除)
- `app/_layout.tsx` (Platform検出追加)
- `README.md` (Platform Supportセクション追加)
- `CLAUDE.md` (Platform Supportセクション追加)

**削除対象:**
- なし（依存関係は保持）

### Phase 2（Optional）

**更新ファイル:**
- `app.json` (web設定削除)

**削除ファイル:**
- `assets/favicon.png`

---

## 潜在的なリスク

### リスク1: expo-routerのビルド失敗
**影響:** react-native-web削除時にモバイルビルドも失敗
**対策:** react-native-webとreact-domを**削除しない**（Phase 2から削除タスクを除外）
**ステータス:** ✅ 計画に反映済み

### リスク2: 既存のPlatform.select動作変化
**影響:** theme.ts等のPlatform.select箇所が影響を受ける可能性
**対策:** ユニットテスト実行で検証
**ステータス:** ✅ テスト計画に含む

### リスク3: CI/CDパイプラインでのWeb Build
**影響:** GitHub Actions等でWebビルドジョブが存在する場合、失敗する
**対策:** CI/CD設定確認と必要に応じてWebビルドジョブ削除
**チェック項目:**
- [ ] `.github/workflows/`ディレクトリ確認
- [ ] `eas.json`にwebプラットフォーム設定があるか確認
- [ ] 該当する場合は削除

### リスク4: Expo Goアプリでのテスト
**影響:** Expo Goアプリで`platforms`制限が適用されない可能性
**対策:** 実機/エミュレーターでの開発ビルドで検証
**ステータス:** テスト計画に実機確認を含む

---

## 実装時の注意事項

### 重要な順守事項

1. **依存関係を削除しない**
   - `react-native-web` → 保持（expo-router依存）
   - `react-dom` → 保持（expo-router依存）
   - Phase 2でも削除しない

2. **変更順序を守る**
   - app.json → package.json → _layout.tsx → ドキュメント の順

3. **既存コードへの影響最小化**
   - データベース層は変更しない
   - UI層は_layout.tsx以外変更しない
   - テーマシステムは変更しない

4. **Git履歴の保持**
   - 変更前に現在の状態をコミット
   - 各フェーズごとにコミット

5. **テストの徹底**
   - 変更後は必ずユニットテスト実行
   - Android/iOS両方で実機確認

---

## 依存関係

### 実装前提
- 現在のコードベース
- Expo SDK 54.0.32
- expo-router 6.0.22

### ブロッカー
- なし

### 並行作業可能
- ドキュメント更新（README.md, CLAUDE.md）は独立して実施可能
- CI/CD設定確認は別タスクとして実施可能

---

## 完了条件

### Phase 1完了条件

- [ ] `app.json`に`"platforms": ["ios", "android"]`が追加されている
- [ ] `package.json`から`web`スクリプトが削除されている
- [ ] `app/_layout.tsx`にPlatform検出コードが追加されている
- [ ] README.mdにPlatform Supportセクションが追加されている
- [ ] CLAUDE.mdにPlatform Supportセクションが追加されている
- [ ] `npm run web`がエラーを返す
- [ ] `npm start`後に`w`を押してもWebが起動しない
- [ ] `npm run android`が正常に動作する
- [ ] `npm run ios`が正常に動作する
- [ ] `npm test`が全てパスする
- [ ] 既存のモバイル機能が全て動作する

### Phase 2完了条件（Optional）

- [ ] `app.json`から`web`設定が削除されている
- [ ] `assets/favicon.png`が削除されている
- [ ] CI/CDからWebビルドジョブが削除されている（該当する場合）

---

## 補足: v1からv2の主な変更点

| 項目 | v1 | v2 | 理由 |
|------|----|----|------|
| app.json設定 | `bundler: metro` | `platforms: ["ios", "android"]` | Expoの正式な方法 |
| react-native-web | Phase 2で削除 | 保持 | expo-router依存 |
| react-dom | 言及なし | 保持 | expo-router依存 |
| Platform検出 | optional | 必須 | 多層防御 |
| CLAUDE.md | 言及なし | 更新 | ドキュメント統一 |
| CI/CD | 言及なし | 確認項目追加 | 本番環境対応 |
| ロールバック | 個別 | git revert推奨 | 安全性向上 |

---

## 参考情報

### Expo Platforms設定
- [Expo Documentation: app.json](https://docs.expo.dev/versions/latest/config/app/)
- `platforms`フィールドはビルド対象プラットフォームを明示的に制御

### expo-router依存関係
- expo-router@6.0.22のpeer dependencies:
  - react-native-web: *
  - react-dom: *
- これらを削除するとnpm installでwarning/error

### Platform検出
- `Platform.OS`は"ios" | "android" | "web" | "windows" | "macos"を返す
- Web実行時は"web"を返すため、早期リターンで実行をブロック可能
