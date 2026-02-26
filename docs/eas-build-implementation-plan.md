# EAS Build 実装計画書

**プロジェクト:** One Day OS
**作成日:** 2026-02-08
**目的:** EAS Build セットアップにより実機 IAP テストおよび App Store / Google Play 提出を可能にする
**ステータス:** 計画段階

---

## 目次

1. [現状分析](#現状分析)
2. [Phase 1: 前提条件セットアップ](#phase-1-前提条件セットアップ)
3. [Phase 2: app.json 修正](#phase-2-appjson-修正)
4. [Phase 3: eas.json 最適化](#phase-3-easjson-最適化)
5. [Phase 4: .gitignore 更新](#phase-4-gitignore-更新)
6. [Phase 5: npm scripts 追加](#phase-5-npm-scripts-追加)
7. [Phase 6: ビルド実行](#phase-6-ビルド実行)
8. [Phase 7: ストア商品登録](#phase-7-ストア商品登録)
9. [Phase 8: ストア提出準備](#phase-8-ストア提出準備)
10. [トラブルシューティング](#トラブルシューティング)
11. [チェックリスト総括](#チェックリスト総括)

---

## 現状分析

### 完了済み

| 項目 | 状態 | 詳細 |
|------|------|------|
| `eas.json` | 存在 | development / preview / production プロファイル定義済み |
| `expo-dev-client` | インストール済み | v6.0.20 |
| `react-native-iap` | インストール済み | v12.16.4 |
| IAP コード | 実装済み | IAPService, InsuranceManager, IdentityBackupManager, InsuranceModal, death.tsx 7段階フロー |
| Feature Flag | 有効 | `INSURANCE_ENABLED: true` |
| テスト | 通過 | 777 tests passing, 0 TS errors |

### 未完了 / 要設定

| 項目 | 問題 | 対応 Phase |
|------|------|-----------|
| eas-cli | 未インストール | Phase 1 |
| Expo アカウント | 未ログイン | Phase 1 |
| Apple Developer アカウント | 未設定 | Phase 1 |
| Google Play Console | 未設定 | Phase 1 |
| `ios.bundleIdentifier` | 未設定 | Phase 2 |
| `android.package` | 未設定 | Phase 2 |
| `expo-dev-client` plugin | plugins 配列に未追加 | Phase 2 |
| コード署名 | 未設定（EAS 管理可能） | Phase 6 |
| `.gitignore` EAS 関連 | 不足エントリあり | Phase 4 |
| IAP 商品登録 | App Store Connect / Google Play Console 未登録 | Phase 7 |

### IAP 商品情報

| 項目 | 値 |
|------|-----|
| iOS Product ID | `com.nonturn.onedayos.identity_insurance` |
| Android Product ID | `identity_insurance` |
| 商品タイプ | 消耗型（Consumable） |
| 価格 | ¥1,500 |
| 定義場所 | `src/constants/index.ts` (`INSURANCE_CONSTANTS`) |

---

## Phase 1: 前提条件セットアップ

**種別:** 手動作業
**所要時間目安:** 30分〜1時間（Apple Developer / Google Play 登録は別途数日）
**依存:** なし（他の全 Phase の前提条件）

### 1.1 eas-cli インストール

```bash
npm install -g eas-cli
```

**確認コマンド:**

```bash
eas --version
# 期待出力: eas-cli/16.x.x (またはそれ以降)
```

> **注意:** eas.json に `"cli": { "version": ">= 16.0.0" }` が定義済みのため、16.x 以上が必要。

### 1.2 Expo アカウントログイン

```bash
eas login
```

プロンプトに従い、Expo アカウントのメールアドレスとパスワードを入力する。

**アカウント未作成の場合:**

1. https://expo.dev/signup にアクセス
2. アカウント作成（メール: `snp.inc.info@gmail.com` 推奨）
3. メール認証を完了
4. `eas login` を再実行

**確認コマンド:**

```bash
eas whoami
# 期待出力: ログインしたユーザー名が表示される
```

### 1.3 Apple Developer Program 登録

**これは手動作業であり、Apple による審査で最大48時間かかる場合がある。**

| ステップ | 操作 |
|----------|------|
| 1 | https://developer.apple.com/programs/ にアクセス |
| 2 | Apple ID でサインイン（NonTurn LLC 用の Apple ID を使用） |
| 3 | 「Enroll」をクリック |
| 4 | 組織（Organization）として登録：会社名 = NonTurn LLC |
| 5 | D-U-N-S ナンバーが必要（未取得の場合は申請、取得に数日） |
| 6 | 年間 $99 USD（約 ¥15,000）の支払い |
| 7 | 登録完了後 https://appstoreconnect.apple.com にアクセス可能か確認 |

> **D-U-N-S ナンバー:** 法人として Apple Developer Program に登録するには D-U-N-S ナンバーが必須。https://developer.apple.com/enroll/duns-lookup/ で検索・申請できる。取得に最大2週間かかる場合がある。個人アカウントで先に登録し、後から組織に変更することも可能。

### 1.4 Google Play Console 登録

| ステップ | 操作 |
|----------|------|
| 1 | https://play.google.com/console/signup にアクセス |
| 2 | Google アカウントでサインイン |
| 3 | デベロッパー名: NonTurn LLC |
| 4 | 登録料 $25 USD（1回限り） |
| 5 | 組織の確認手続き完了（IAP 利用には組織アカウントが必要） |
| 6 | 支払いプロファイルの設定（Google Payments Merchant Center） |

> **重要:** Google Play で IAP（アプリ内課金）を利用するには、支払いプロファイル（Merchant Account）のセットアップが必須。Console 登録後、「収益化 > 収益化のセットアップ」から設定する。

### 1.5 プロジェクトとExpoアカウントの紐付け

```bash
cd /Users/noritakasawada/AI_P/one-day-os
eas init
```

このコマンドにより以下が行われる:
- `app.json` に `expo.extra.eas.projectId` が自動追加される
- Expo ダッシュボード上にプロジェクトが作成される

**確認:** https://expo.dev にログインしてプロジェクト一覧に "One Day OS" が表示されることを確認。

---

## Phase 2: app.json 修正

**種別:** コード変更（サブエージェント実行可能）
**所要時間目安:** 5分
**依存:** Phase 1（プロジェクト紐付け完了後）

### 2.1 変更内容

以下の3点を `app.json` に追加する:

1. `ios.bundleIdentifier` の追加
2. `android.package` の追加
3. `expo-dev-client` の plugins 配列への追加

### 2.2 変更差分

**変更前（ios セクション）:**

```json
"ios": {
  "supportsTablet": false,
  "infoPlist": {
    "UIBackgroundModes": [
      "remote-notification"
    ]
  }
}
```

**変更後（ios セクション）:**

```json
"ios": {
  "bundleIdentifier": "com.nonturn.onedayos",
  "supportsTablet": false,
  "infoPlist": {
    "UIBackgroundModes": [
      "remote-notification"
    ]
  }
}
```

---

**変更前（android セクション）:**

```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#000000"
  },
  "permissions": [
    "POST_NOTIFICATIONS",
    "SCHEDULE_EXACT_ALARM"
  ],
  "allowBackup": false,
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false
}
```

**変更後（android セクション）:**

```json
"android": {
  "package": "com.nonturn.onedayos",
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#000000"
  },
  "permissions": [
    "POST_NOTIFICATIONS",
    "SCHEDULE_EXACT_ALARM"
  ],
  "allowBackup": false,
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false
}
```

> **注意:** `com.android.vending.BILLING` パーミッションは**不要**。`react-native-iap` v12 は Google Play Billing Library（`com.android.billingclient:billing-ktx`）を使用しており、このパーミッションを必要としない。

---

**変更前（plugins セクション）:**

```json
"plugins": [
  ["expo-notifications", { "sounds": [] }],
  "expo-router",
  "expo-localization"
]
```

**変更後（plugins セクション）:**

```json
"plugins": [
  ["expo-notifications", { "sounds": [] }],
  "expo-router",
  "expo-localization",
  "expo-dev-client",
  "react-native-iap"
]
```

### 2.3 react-native-iap と Expo Config Plugin について

`react-native-iap` v12.16.4 は Expo Config Plugin を**内蔵している**（`app.plugin.js`）。この Config Plugin は `plugins` 配列に**追加が必須**。

**Config Plugin の役割:**
1. Android の `build.gradle` に `missingDimensionStrategy "store", "play"` を注入
2. `react-native-iap` のライブラリは `productFlavors` に `amazon` と `play` を定義しているため、アプリ側でどちらを使うか指定する必要がある
3. **この Config Plugin がないと、Android の Gradle ビルドが以下のエラーで失敗する:**

```
Could not select value from candidates [amazon, play] because no value was specified for dimension 'store'
```

> **注意:** Config Plugin はオプショナル引数 `paymentProvider`（`"Play Store"` | `"Amazon AppStore"` | `"both"`）を受け付ける。デフォルトは `"Play Store"` であり、本プロジェクトではデフォルトのままで正しい。

### 2.4 iOS StoreKit Capability について

EAS Build の iOS ビルドでは、`react-native-iap` の利用に **In-App Purchase Capability** が必要。これは以下のいずれかの方法で設定する:

**方法 A: Apple Developer Portal で手動設定（推奨）**

1. https://developer.apple.com/account/resources/identifiers にアクセス
2. Bundle ID `com.nonturn.onedayos` を登録（または既存を選択）
3. Capabilities タブで「In-App Purchase」にチェック
4. Save

**方法 B: EAS Build が自動設定**

EAS Build が Provisioning Profile を生成する際に、必要な Capability を自動的に含める場合がある。ただし確実性のため方法 A を推奨。

### 2.5 最終的な app.json 全体像

```json
{
  "expo": {
    "name": "One Day OS",
    "slug": "one-day-os",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "scheme": "onedayos",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "androidMode": "default",
      "androidCollapsedTitle": "One Day OS"
    },
    "ios": {
      "bundleIdentifier": "com.nonturn.onedayos",
      "supportsTablet": false,
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "package": "com.nonturn.onedayos",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "permissions": [
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM"
      ],
      "allowBackup": false,
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": { "favicon": "./assets/favicon.png" },
    "plugins": [
      ["expo-notifications", { "sounds": [] }],
      "expo-router",
      "expo-localization",
      "expo-dev-client",
      "react-native-iap"
    ]
  }
}
```

> **注意:** `eas init` 実行後に `expo.extra.eas.projectId` が自動追加される。上記には含めていないが、Phase 1.5 の結果として追加される。

---

## Phase 3: eas.json 最適化

**種別:** コード変更（サブエージェント実行可能）
**所要時間目安:** 5分
**依存:** Phase 2

### 3.1 現在の問題点

| 問題 | 説明 |
|------|------|
| `development` が simulator 限定 | `"ios": { "simulator": true }` のため実機テスト不可 |
| simulator 用プロファイルが消える | development を実機用に変更すると simulator ビルドができなくなる |
| iOS IAP テスト不可 | StoreKit はシミュレーターでは動作しない（StoreKit Testing 除く） |
| 環境変数未設定 | ビルド間の区別がない |

### 3.2 変更後の eas.json

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "base": {
      "node": "22.22.0",
      "env": {
        "APP_ENV": "development"
      }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "development-simulator": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      },
      "env": {
        "APP_ENV": "preview"
      }
    },
    "production": {
      "extends": "base",
      "distribution": "store",
      "autoIncrement": true,
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      },
      "android": {
        "track": "internal",
        "serviceAccountKeyPath": "./google-service-account.json"
      }
    }
  }
}
```

### 3.3 各プロファイルの説明

| プロファイル | 用途 | iOS | Android | 配布 |
|-------------|------|-----|---------|------|
| `development` | 実機デバッグ（IAP テスト含む） | Ad Hoc（実機） | APK（デバッグ） | internal |
| `development-simulator` | シミュレーター開発 | Simulator ビルド | N/A | internal |
| `preview` | 内部テスター配布 | Ad Hoc | APK | internal |
| `production` | ストア提出 | App Store | AAB | store |

### 3.4 重要な設定項目

**`base` プロファイル:**
- `node: "22.22.0"`: ビルド環境の Node.js バージョンを固定。ローカル開発環境と一致させる。
- 全プロファイルが `extends: "base"` で共通設定を継承。

**`appVersionSource: "remote"`:**
- ビルド番号（`ios.buildNumber` / `android.versionCode`）を EAS サーバーで管理。`react-native-iap` の Config Plugin が `build.gradle` に product flavors を導入するため、`"local"` モードの `autoIncrement` が正しく動作しない可能性がある。`"remote"` モードではこの問題を回避できる。

**`autoIncrement: true`（production のみ）:**
- ビルドごとに `ios.buildNumber` / `android.versionCode` を自動インクリメント。

**`submit.production`:**
- `ascAppId`: App Store Connect で作成したアプリの App ID（数字）。Phase 7 で取得後に設定。
- `appleTeamId`: Apple Developer アカウントの Team ID。
- `serviceAccountKeyPath`: Google Play Console のサービスアカウント JSON キー。Phase 7 で取得後に設定。
- `track: "internal"`: 最初は内部テストトラックに提出。

> **注意:** `submit.production` の `ascAppId`, `appleTeamId`, `serviceAccountKeyPath` は Phase 7 完了後にプレースホルダーを実際の値に置き換えること。

### 3.5 iOS BILLING_KEY について

iOS の StoreKit では `BILLING_KEY` のような環境変数は**不要**。StoreKit framework は bundleIdentifier を基に自動的にストア接続を行う。Android の Google Play Billing も同様に自動接続。`react-native-iap` はプラットフォーム固有のネイティブ API を内部で使用しており、追加のキー設定は不要。

---

## Phase 4: .gitignore 更新

**種別:** コード変更（サブエージェント実行可能）
**所要時間目安:** 2分
**依存:** なし（独立して実行可能）

### 4.1 現在の .gitignore の確認

現在の `.gitignore` には以下の関連エントリが既に存在する:

```gitignore
# Native
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# generated native folders
/ios
/android
```

### 4.2 追加が必要なエントリ

以下のエントリを `.gitignore` の末尾に追加する:

```gitignore
# EAS Build
credentials/
google-services.json
google-service-account.json
*.keystore

# EAS local builds
.eas/
```

### 4.3 各エントリの説明

| エントリ | 説明 |
|----------|------|
| `credentials/` | EAS が生成するクレデンシャルディレクトリ |
| `google-services.json` | Firebase / Google Play 設定ファイル（シークレット含む） |
| `google-service-account.json` | Google Play Console API キー（eas submit で使用） |
| `*.keystore` | Android 署名キーストア（既に `*.jks` はあるが `.keystore` 拡張子も対応） |
| `.eas/` | EAS ローカルビルドの一時ファイル |

### 4.4 既存エントリとの重複確認

| 拡張子 | 既存 | 追加不要 |
|--------|------|----------|
| `*.jks` | あり | 不要（Java KeyStore） |
| `*.p12` | あり | 不要（PKCS#12 証明書） |
| `*.p8` | あり | 不要（Apple Auth Key） |
| `*.key` | あり | 不要（秘密鍵） |
| `*.mobileprovision` | あり | 不要（iOS Provisioning Profile） |
| `*.pem` | あり | 不要（PEM 証明書） |

---

## Phase 5: npm scripts 追加

**種別:** コード変更（サブエージェント実行可能）
**所要時間目安:** 3分
**依存:** Phase 2, Phase 3

### 5.1 追加するスクリプト

`package.json` の `scripts` セクションに以下を追加する:

**変更前:**

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "test": "jest",
  "lint": "npx tsc --noEmit",
  "typecheck": "npx tsc --noEmit",
  "generate-noise": "node scripts/generate-noise.js"
}
```

**変更後:**

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "test": "jest",
  "lint": "npx tsc --noEmit",
  "typecheck": "npx tsc --noEmit",
  "generate-noise": "node scripts/generate-noise.js",
  "build:dev:ios": "eas build --profile development --platform ios",
  "build:dev:android": "eas build --profile development --platform android",
  "build:dev-sim:ios": "eas build --profile development-simulator --platform ios",
  "build:preview:ios": "eas build --profile preview --platform ios",
  "build:preview:android": "eas build --profile preview --platform android",
  "build:prod:ios": "eas build --profile production --platform ios",
  "build:prod:android": "eas build --profile production --platform android",
  "submit:ios": "eas submit --platform ios --profile production",
  "submit:android": "eas submit --platform android --profile production"
}
```

### 5.2 各スクリプトの説明

| スクリプト | 用途 | いつ使うか |
|-----------|------|----------|
| `build:dev:ios` | iOS 実機用開発ビルド | IAP テスト、デバッグ |
| `build:dev:android` | Android 実機用開発ビルド | IAP テスト、デバッグ |
| `build:dev-sim:ios` | iOS シミュレーター用開発ビルド | UI 開発、非 IAP テスト |
| `build:preview:ios` | iOS 内部テスト用ビルド | テスターへの配布 |
| `build:preview:android` | Android 内部テスト用ビルド（APK） | テスターへの配布 |
| `build:prod:ios` | iOS App Store 提出用ビルド | ストア提出時 |
| `build:prod:android` | Android Google Play 提出用ビルド（AAB） | ストア提出時 |
| `submit:ios` | App Store への提出 | ストア提出時 |
| `submit:android` | Google Play への提出 | ストア提出時 |

---

## Phase 6: ビルド実行

**種別:** 手動作業（コマンド実行 + 実機操作）
**所要時間目安:** iOS ビルド 15〜30分、Android ビルド 10〜20分（EAS クラウドビルド）
**依存:** Phase 1〜5 全て完了

### 6.1 初回ビルド前の確認事項

```bash
# 1. eas-cli がインストールされていることを確認
eas --version

# 2. Expo にログインしていることを確認
eas whoami

# 3. プロジェクトが紐付けられていることを確認
# app.json に expo.extra.eas.projectId が存在するか確認

# 4. Git の状態をクリーンにする（EAS Build は Git コミットを使用）
git add -A
git commit -m "chore: EAS Build setup"
```

> **重要:** EAS Build はビルド時に Git のコミット内容をアップロードする。未コミットの変更があるとビルドに含まれないか、エラーになる場合がある。

### 6.2 iOS 実機ビルド（development）

```bash
npm run build:dev:ios
# または直接:
# eas build --profile development --platform ios
```

**初回実行時に聞かれる質問:**

| 質問 | 推奨回答 |
|------|---------|
| "Would you like to log in to your Apple account?" | **Yes** |
| Apple ID / パスワード入力 | Apple Developer アカウントの認証情報 |
| "Would you like EAS to manage your credentials?" | **Yes**（推奨。EAS がプロビジョニングプロファイルと証明書を自動管理） |
| "Select a team" | NonTurn LLC（該当する Team を選択） |
| "Register new device?" | **Yes**（テスト用実機の UDID を登録） |

**デバイス登録（Ad Hoc 配布に必要）:**

```bash
# テスト用デバイスの登録
eas device:create
# QR コードが表示されるので、テスト用 iPhone で読み取る
# プロファイルがインストールされ、UDID が自動登録される
```

> **注意:** iOS の Ad Hoc 配布（development / preview プロファイル）では、テスト用デバイスを Apple Developer Portal に登録する必要がある。EAS の `eas device:create` を使えば QR コード経由で簡単に登録できる。

**ビルド完了後:**

1. EAS ダッシュボード（https://expo.dev）でビルドステータスを確認
2. ビルド成功後、ダッシュボードまたはターミナルに表示される QR コード / URL からインストール
3. または以下のコマンドでインストール:

```bash
# 最新の development ビルドをデバイスにインストール
eas build:run --profile development --platform ios
```

### 6.3 Android 実機ビルド（development）

```bash
npm run build:dev:android
# または直接:
# eas build --profile development --platform android
```

**初回実行時に聞かれる質問:**

| 質問 | 推奨回答 |
|------|---------|
| "Generate a new Android Keystore?" | **Yes**（EAS が自動管理） |

**ビルド完了後:**

1. ビルド成功後、APK ダウンロード URL が表示される
2. Android 端末にダウンロードしてインストール
3. 「提供元不明のアプリ」を許可する必要がある場合あり

```bash
# 最新の development ビルドをデバイスにインストール（USB 接続 + adb 必要）
eas build:run --profile development --platform android
```

### 6.4 Expo Dev Client 起動確認

ビルドを実機にインストール後:

1. アプリアイコンをタップして起動
2. **Expo Dev Client** の画面が表示される（黒い開発者メニュー画面）
3. 開発サーバーに接続する:

```bash
# 開発サーバーを起動（ローカルマシン上）
npx expo start --dev-client
```

4. 実機の Expo Dev Client で開発サーバーの URL を入力、または QR コードをスキャン
5. アプリがロードされれば成功

### 6.5 IAP サンドボックステスト

#### iOS Sandbox Testing

**前提条件:**
- App Store Connect に IAP 商品が登録済み（Phase 7 参照）
- Sandbox テスターアカウントの作成

**Sandbox テスターアカウント作成手順:**

1. https://appstoreconnect.apple.com にアクセス
2. 「ユーザーとアクセス」>「Sandbox」>「テスター」
3. 「+」ボタンでテスターを追加
4. 実在しないメールアドレスを使用可能（例: `sandbox-tester@nonturn.com`）
5. 日本を選択、適当なパスワードを設定

**テスト手順:**

1. iPhone の「設定」>「App Store」>「サンドボックスアカウント」にテスターアカウントを設定
   （iOS 16以降は設定アプリ内に Sandbox セクションがある）
2. development ビルドをインストールした実機でアプリを起動
3. IH を 0% にするか、デバッグ操作で InsuranceModal を表示
4. 「Identity Insurance を購入」ボタンをタップ
5. Sandbox テスターの認証ダイアログが表示される
6. パスワードを入力して購入
7. **実際の課金は発生しない**（Sandbox 環境のため）

**確認ポイント:**
- [ ] `IAPService.initialize()` が `true` を返すか
- [ ] `IAPService.getProduct()` が商品情報（ローカライズ価格含む）を返すか
- [ ] 購入フローが正常に完了するか
- [ ] `finishTransaction()` が呼ばれるか
- [ ] InsuranceManager の復活ロジックが動作するか

#### Android テスト

**前提条件:**
- Google Play Console にアプリとIAP 商品が登録済み（Phase 7 参照）
- 内部テストトラックにビルドをアップロード済み
- テストアカウントが「ライセンステスター」に追加済み

**ライセンステスター設定手順:**

1. Google Play Console >「設定」>「ライセンステスト」
2. テスト用 Google アカウントのメールアドレスを追加
3. ライセンス応答を「RESPOND_NORMALLY」に設定

> **重要:** Android の IAP テストは、内部テストトラックにビルドを1回でもアップロードしないと動作しない。APK を直接インストール（sideload）した場合、Google Play Billing API は接続エラーを返す。

**テスト手順:**

1. Google Play Console の内部テストトラックにビルドをアップロード
2. テスト用 Google アカウントを内部テスターに招待
3. テスターが招待リンクからオプトイン
4. Google Play Store からアプリをインストール（または更新）
5. アプリ内で IAP フローをテスト
6. テスト購入は「テスト注文」として処理される（実課金なし）

---

## Phase 7: ストア商品登録

**種別:** 手動作業
**所要時間目安:** 各30分〜1時間
**依存:** Phase 1（Apple Developer / Google Play Console 登録完了）

### 7.1 App Store Connect: IAP 商品作成

#### 7.1.1 アプリの作成

1. https://appstoreconnect.apple.com にアクセス
2. 「マイ App」>「+」>「新規 App」
3. 以下の情報を入力:

| フィールド | 値 |
|-----------|-----|
| プラットフォーム | iOS |
| 名前 | One Day OS |
| プライマリ言語 | 日本語 |
| バンドル ID | `com.nonturn.onedayos`（事前に Certificates, Identifiers & Profiles で登録しておく） |
| SKU | `one-day-os` |

#### 7.1.2 IAP 商品の作成

1. App Store Connect でアプリページを開く
2. 左メニュー「App 内課金」>「管理」
3. 「+」ボタンをクリック
4. 種類: **消耗型** を選択
5. 以下の情報を入力:

| フィールド | 値 |
|-----------|-----|
| 参照名 | Identity Insurance |
| 製品 ID | `com.nonturn.onedayos.identity_insurance` |
| 価格表 | ¥1,500（Tier 相当を選択） |

6. 「ローカリゼーション」を追加:

| フィールド | 値（日本語） | 値（英語） |
|-----------|-------------|------------|
| 表示名 | アイデンティティ保険 | Identity Insurance |
| 説明 | IH が 0% に到達した際、データワイプを回避してアイデンティティを復活させます。IH 10% で復元されます。 | Prevents data wipe when IH reaches 0%. Restores identity at 10% IH. |

7. スクリーンショットを追加（審査用。IAP 購入画面のスクリーンショット）
8. 「審査に向けて送信」のステータスにする

> **注意:** IAP 商品は、アプリのバイナリが App Store Connect にアップロードされるまで「審査のために送信」できない。まず商品を作成し、Phase 8 でバイナリ提出時に一緒に審査に出す。

#### 7.1.3 App Store Connect に IAP 商品が反映されるまで

IAP 商品を作成後、Sandbox テスト環境に反映されるまで最大数時間かかる場合がある。ステータスが「送信準備完了」であれば Sandbox でテスト可能。

### 7.2 Google Play Console: 管理対象アイテム作成

#### 7.2.1 アプリの作成

1. https://play.google.com/console にアクセス
2. 「すべてのアプリ」>「アプリを作成」
3. 以下の情報を入力:

| フィールド | 値 |
|-----------|-----|
| アプリ名 | One Day OS |
| デフォルトの言語 | 日本語 – ja |
| アプリまたはゲーム | アプリ |
| 無料またはお支払い | 無料 |
| デベロッパープログラムポリシー | 同意する |
| 米国輸出法 | 同意する |

#### 7.2.2 内部テストトラックへの初回アップロード

**Google Play で IAP 商品を作成するには、最低1つの AAB（Android App Bundle）をアップロードする必要がある。**

```bash
# production ビルドを作成
npm run build:prod:android

# ビルド完了後、EAS ダッシュボードから AAB をダウンロード
# または以下で直接提出:
npm run submit:android
```

1. Google Play Console >「テスト」>「内部テスト」>「新しいリリースの作成」
2. AAB ファイルをアップロード
3. リリース名: `1.0.0-internal.1`
4. リリースノート: 「内部テスト用初回ビルド」
5. 「確認してリリース」

#### 7.2.3 IAP 商品の作成

1. Google Play Console でアプリページを開く
2. 左メニュー「収益化」>「アプリ内アイテム」
3. 「アイテムを作成」をクリック
4. 以下の情報を入力:

| フィールド | 値 |
|-----------|-----|
| アイテム ID | `identity_insurance` |
| 名前 | Identity Insurance |
| 説明 | IH が 0% に到達した際、データワイプを回避してアイデンティティを復活させます。 |
| デフォルト価格 | ¥1,500 |

5. ステータスを「有効」に変更
6. 保存

> **重要:** Google Play の IAP 商品は、`アイテム ID` を一度作成すると変更・削除できない。`identity_insurance` であることを確認してから作成すること。この ID は `src/constants/index.ts` の `INSURANCE_CONSTANTS.PRODUCT_ID_ANDROID` と完全一致している必要がある。

#### 7.2.4 Google Play サービスアカウント設定（eas submit 用）

`eas submit` で Android ビルドを Google Play に自動提出するために、サービスアカウントの JSON キーが必要:

1. Google Play Console >「設定」>「API アクセス」
2. 「サービスアカウントを作成」のリンクをクリック（Google Cloud Console に遷移）
3. サービスアカウントを作成:
   - 名前: `eas-submit`
   - 役割: 「サービスアカウントユーザー」
4. JSON キーを作成してダウンロード
5. ダウンロードしたファイルを `google-service-account.json` としてプロジェクトルートに配置
6. Google Play Console に戻り、サービスアカウントに「リリースマネージャー」権限を付与

> **セキュリティ:** `google-service-account.json` は `.gitignore` に含めること（Phase 4 で追加済み）。Git にコミットしてはならない。

---

## Phase 8: ストア提出準備

**種別:** 手動作業 + 一部コード変更
**所要時間目安:** 数時間〜数日（審査を含む）
**依存:** Phase 1〜7 全て完了、IAP テスト完了

### 8.1 eas submit 設定

Phase 3 で `eas.json` の `submit` セクションにプレースホルダーを設定済み。ストア登録完了後に実際の値を入力する。

**iOS:**

```bash
# App Store Connect の App ID を確認
# App Store Connect > アプリ > 一般 > App 情報 > Apple ID（数字）
# eas.json の submit.production.ios.ascAppId に設定

# Apple Team ID を確認
# https://developer.apple.com/account > Membership Details > Team ID
# eas.json の submit.production.ios.appleTeamId に設定
```

**Android:**

```bash
# google-service-account.json をプロジェクトルートに配置済みであることを確認
ls -la google-service-account.json
```

### 8.2 production ビルド作成

```bash
# iOS
npm run build:prod:ios

# Android
npm run build:prod:android
```

### 8.3 ストアへの提出

```bash
# iOS - App Store Connect に IPA を提出
npm run submit:ios

# Android - Google Play Console に AAB を提出
npm run submit:android
```

### 8.4 App Store 提出に必要なメタデータ

App Store Connect で以下の情報を事前に準備しておく:

| 項目 | 必要な内容 |
|------|-----------|
| スクリーンショット | iPhone 6.7インチ（必須）、iPhone 6.5インチ、iPhone 5.5インチ |
| アプリアイコン | 1024x1024 PNG（透過なし） |
| 説明文 | 日本語・英語 |
| キーワード | 各言語 100 文字以内 |
| サポート URL | https://non-turn.com/ |
| プライバシーポリシー URL | 必須（IAP があるため特に重要） |
| 年齢制限 | 質問に回答して設定 |
| カテゴリ | 「仕事効率化」または「ライフスタイル」 |
| App 内課金の表示 | Identity Insurance を「App 内課金のプロモーション」に追加 |

**App 審査に関する注意事項:**

| 注意点 | 詳細 |
|--------|------|
| データ削除機能 | One Day OS は IH=0% でデータを完全消去する。Apple の審査ガイドライン 5.1.1 に抵触しないよう、審査メモで仕様であることを説明する必要あり。 |
| IAP 復元 | 消耗型のため「復元」ボタンは不要だが、審査時に問われる場合がある。「消耗型であり復元は不要」と審査メモに記載。 |
| バックグラウンド処理 | `UIBackgroundModes: remote-notification` を使用。通知がバックグラウンドで処理される理由を審査メモで説明。 |

**審査メモのテンプレート:**

```
This app is an identity accountability system. Key design decisions:

1. DATA WIPE FEATURE: When "Identity Health" reaches 0%, all user data is intentionally and permanently deleted. This is a core feature, not a bug. Users are informed during onboarding.

2. IN-APP PURCHASE: "Identity Insurance" is a consumable purchase (¥1,500) that prevents data wipe when IH reaches 0%. It is consumed upon use and must be repurchased each time.

3. TIME-BASED ACCESS: Certain features are restricted to specific times of day (Morning: 6-12, Evening: 18-24). This is intentional UX design.

4. NOTIFICATIONS: 6 daily notifications at fixed times. Users must respond within 5 minutes. This is core to the app's accountability mechanism.

Test account: Not applicable (local-only app, no server-side accounts).
```

### 8.5 Google Play 提出に必要なメタデータ

| 項目 | 必要な内容 |
|------|-----------|
| スクリーンショット | スマートフォン用最低2枚、7インチタブレット、10インチタブレット |
| フィーチャーグラフィック | 1024x500 PNG/JPG |
| アプリアイコン | 512x512 PNG |
| 短い説明 | 80文字以内 |
| 詳しい説明 | 4000文字以内 |
| プライバシーポリシー URL | 必須 |
| コンテンツのレーティング | Google Play のレーティング質問に回答 |
| カテゴリ | 「仕事効率化」 |
| ターゲットユーザー層 | 18歳以上（データ削除機能のため） |
| データセーフティ | データ収集・共有に関する申告（ローカルのみの旨を記載） |

---

## トラブルシューティング

### ビルドエラー

#### E1: `react-native-iap` ネイティブモジュールリンクエラー

```
Error: Unable to resolve module 'react-native-iap'
```

**原因:** autolinking が正しく動作していない
**解決策:**

```bash
# キャッシュクリアして再ビルド
eas build --profile development --platform ios --clear-cache
```

#### E2: iOS Provisioning Profile エラー

```
Error: No matching provisioning profile found
```

**原因:** デバイスが Apple Developer Portal に未登録、または Provisioning Profile が古い
**解決策:**

```bash
# クレデンシャルをリセットして再生成
eas credentials --platform ios
# 「Provisioning Profile」>「Create new」を選択
```

#### E3: Android Store Flavor ビルドエラー

```
Could not select value from candidates [amazon, play] because no value was specified for dimension 'store'
```

**原因:** `react-native-iap` の Config Plugin が `app.json` の `plugins` 配列に追加されていない
**解決策:** Phase 2 の plugins 変更を確認。`"react-native-iap"` が `plugins` 配列に含まれているか確認。

#### E4: `expo-dev-client` ビルドエラー

```
Error: expo-dev-client is not configured
```

**原因:** `app.json` の plugins 配列に `expo-dev-client` が未追加
**解決策:** Phase 2 の plugins 変更を確認。

#### E5: EAS Build が古いコードを使用している

**原因:** 未コミットの変更がある
**解決策:**

```bash
git add -A
git commit -m "chore: update for EAS build"
# その後再ビルド
```

#### E6: iOS シミュレーターで IAP テストしたい場合

iOS シミュレーターでは Apple の StoreKit に接続できないが、**StoreKit Testing in Xcode** を使えば疑似テストが可能:

1. Xcode で `StoreKitConfiguration.storekit` ファイルを作成
2. 商品を定義（Product ID: `com.nonturn.onedayos.identity_insurance`）
3. スキーマの設定で StoreKit Configuration を指定
4. ただし、これは EAS Build ではなく Xcode の機能であり、Expo managed workflow では使いにくい

**推奨:** IAP テストは実機の development ビルド + Sandbox テスターで行う。

### IAP テスト時の問題

#### P1: 「このアイテムは購入できません」エラー

**iOS の場合:**
- App Store Connect で IAP 商品のステータスが「送信準備完了」であることを確認
- Sandbox テスターアカウントが正しく設定されているか確認
- Bundle ID が App Store Connect の登録と一致しているか確認

**Android の場合:**
- Google Play Console で IAP 商品が「有効」であることを確認
- 内部テストトラックにビルドがアップロードされているか確認
- テストアカウントがライセンステスターに追加されているか確認
- テスターが内部テストに招待されオプトインしているか確認

#### P2: `IAPService.initialize()` が `false` を返す

- 実機で動作しているか確認（シミュレーターでは `false`）
- `react-native-iap` がネイティブモジュールとしてリンクされているか確認
- EAS Build のログで `react-native-iap` の autolinking を確認

#### P3: 購入後に `transactionId` が null

- `react-native-iap` のバージョンが 12.x であることを確認
- `requestPurchase` の戻り値形式がプラットフォームにより異なる（IAPService.ts で配列/オブジェクト両対応済み）

---

## チェックリスト総括

### Phase 1: 前提条件（手動作業）

- [ ] `eas-cli` をグローバルインストール
- [ ] `eas login` で Expo アカウントにログイン
- [ ] Apple Developer Program に登録（$99/年）
- [ ] Google Play Console に登録（$25）
- [ ] `eas init` でプロジェクトを紐付け

### Phase 2: app.json 修正（コード変更）

- [ ] `ios.bundleIdentifier: "com.nonturn.onedayos"` を追加
- [ ] `android.package: "com.nonturn.onedayos"` を追加
- [ ] `plugins` 配列に `"expo-dev-client"` を追加
- [ ] `plugins` 配列に `"react-native-iap"` を追加

### Phase 3: eas.json 最適化（コード変更）

- [ ] `base` プロファイルを追加（Node.js バージョン固定）
- [ ] `development` の `ios.simulator` を `false` に変更
- [ ] `development-simulator` プロファイルを新規追加
- [ ] 全プロファイルに `env.APP_ENV` を追加
- [ ] `production` に `autoIncrement: true` を追加
- [ ] `submit.production` に iOS / Android 設定を追加（プレースホルダー）

### Phase 4: .gitignore 更新（コード変更）

- [ ] `credentials/` を追加
- [ ] `google-services.json` を追加
- [ ] `google-service-account.json` を追加
- [ ] `*.keystore` を追加
- [ ] `.eas/` を追加

### Phase 5: npm scripts 追加（コード変更）

- [ ] `build:dev:ios` を追加
- [ ] `build:dev:android` を追加
- [ ] `build:dev-sim:ios` を追加
- [ ] `build:preview:ios` を追加
- [ ] `build:preview:android` を追加
- [ ] `build:prod:ios` を追加
- [ ] `build:prod:android` を追加
- [ ] `submit:ios` を追加
- [ ] `submit:android` を追加

### Phase 6: ビルド実行（手動作業）

- [ ] iOS development ビルドを実行
- [ ] Android development ビルドを実行
- [ ] 実機にインストールして Expo Dev Client 起動確認
- [ ] `npx expo start --dev-client` で開発サーバーに接続確認
- [ ] IAP Sandbox テスト（iOS）
- [ ] IAP テスト（Android）

### Phase 7: ストア商品登録（手動作業）

- [ ] App Store Connect にアプリを作成
- [ ] iOS IAP 商品「Identity Insurance」を作成（消耗型、¥1,500）
- [ ] Apple Developer Portal で In-App Purchase Capability を有効化
- [ ] Google Play Console にアプリを作成
- [ ] 内部テストトラックに初回 AAB をアップロード
- [ ] Android IAP 商品「identity_insurance」を作成（¥1,500）
- [ ] Google Play サービスアカウントの JSON キーを取得
- [ ] `eas.json` の `submit.production` プレースホルダーを実際の値に更新

### Phase 8: ストア提出準備（手動作業）

- [ ] スクリーンショット（iOS 6.7インチ / Android スマートフォン）
- [ ] アプリアイコン（1024x1024 iOS / 512x512 Android）
- [ ] アプリ説明文（日本語・英語）
- [ ] プライバシーポリシー URL
- [ ] 審査メモ（データ削除機能、IAP、時間制限の説明）
- [ ] production ビルド作成
- [ ] `eas submit` でストアに提出
- [ ] 審査対応

---

## 実行順序サマリー

```
Phase 1 (手動)  ─── 前提条件セットアップ
     │
     ├── Phase 4 (コード) ─── .gitignore 更新（独立して実行可能）
     │
     ▼
Phase 2 (コード) ─── app.json 修正
     │
     ▼
Phase 3 (コード) ─── eas.json 最適化
     │
     ▼
Phase 5 (コード) ─── npm scripts 追加
     │
     ▼
Phase 6 (手動)  ─── ビルド実行 + IAP テスト
     │
     ▼
Phase 7 (手動)  ─── ストア商品登録
     │
     ▼
Phase 8 (手動)  ─── ストア提出
```

**コード変更 Phase（2, 3, 4, 5）はサブエージェントに委任可能。**
**手動作業 Phase（1, 6, 7, 8）はユーザー操作が必要。**
