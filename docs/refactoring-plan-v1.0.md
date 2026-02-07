# One Day OS リファクタリング設計書 v1.0

## 概要

### プロジェクト現状

One Day OSは、React Native + Expo上に構築されたIdentity-driven life accountabilityシステムである。現時点で **35テストスイート / 595テスト** が全パスし、TypeScriptコンパイルエラーもゼロの状態にある。

しかし、急速な開発フェーズを経て以下の技術的負債が蓄積している:

| カテゴリ | 件数 | 概要 |
|---------|------|------|
| CRITICAL | 5件 | 壊れたデッドコード・存在しないテーブル参照 |
| HIGH | 6件 | デバッグ残存・重複コード・カラーシステム不統一 |
| MEDIUM | 7件 | 開発アーティファクト・孤立型定義・importパターン不統一 |
| LOW | 4件 | 型安全性・大ファイル分割・ツール設定 |

### リファクタリング目標

1. **デッドコード・レガシー除去**: 壊れた参照を持つファイルを安全に削除し、コードベースの信頼性を回復する
2. **コード品質統一**: カラーシステム、importパターン、デバッグコードを統一し、一貫性のある保守可能なコードにする
3. **アーキテクチャ整理**: 大ファイルの分割、正しいWipe処理への置換、バレルファイルの整理
4. **ドキュメント・設定整備**: 旧docsの整理、.gitignore更新、lint/typecheckスクリプトの追加

### 前提条件

- 全テスト（595件）がパスした状態を維持すること
- TypeScriptエラーゼロを維持すること
- 各フェーズ完了時にテストを実行し、回帰を検出すること

---

## リファクタリング原則

### 1. 安全性第一

- 削除・変更は必ず影響分析を先行させる
- 各タスク完了後に `npm test` を実行し、全595テストのパスを確認する
- TypeScript型チェックが通ることを確認する

### 2. 段階的実行

- Phase R1（デッドコード除去）→ R2（品質統一）→ R3（アーキテクチャ）→ R4（設定整備）の順に実行
- 各Phase内でもタスク番号順に実行し、依存関係を尊重する

### 3. 最小変更原則

- 機能変更を含まず、既存の振る舞いを完全に保持する
- リファクタリングと機能追加を混在させない

### 4. カラーシステム方針

- `theme.ts` の `brutalistTheme` を単一の信頼源（Single Source of Truth）とする
- `colors.ts` の `Colors` オブジェクトは段階的に廃止する
- 移行完了後に `colors.ts` を削除する

### 5. importパターン方針

- 相対パスを標準とする（現状の大多数が相対パス）
- `@/` エイリアスを使用している2ファイルを相対パスに統一する
- 理由: プロジェクト全体で一貫性を保ち、リファクタリング時のパス管理を簡素化するため

---

## Phase R1: デッドコード・レガシー除去

### タスク R1-1: レガシーDB (db.ts + db.test.ts) 削除

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/database/db.ts` (139行), `src/database/db.test.ts` |
| **修正内容** | 両ファイルを完全削除する |
| **理由** | 全プロダクションコードは `src/database/client.ts` を使用しており、`db.ts` は完全にデッドコードである。`openDatabase()`, `initializeDatabase()`, `resetDatabase()`, `getAppState()`, `updateAppState()`, `closeDatabase()` のいずれも外部からインポートされていない |
| **影響分析** | `db.ts` をインポートしているのは `scripts/reset-db.ts`（R1-5で対応）と `db.test.ts` のみ。プロダクションコードへの影響ゼロ |
| **テスト検証方法** | `npm test` 全テストパス確認。`db.test.ts` のテストが減るが、`client.ts` と `transaction.ts` のテストでDB機能はカバー済み |
| **複雑度** | **S** |

### タスク R1-2: tabs_backup ディレクトリ削除

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `app/tabs_backup/_layout.tsx`, `app/tabs_backup/index.tsx`, `app/tabs_backup/morning.tsx`, `app/tabs_backup/evening.tsx` (4ファイル) |
| **修正内容** | `app/tabs_backup/` ディレクトリを完全削除する |
| **理由** | レガシーなタブナビゲーションのバックアップであり、現在のアプリはExpo Routerのファイルベースルーティング（`app/index.tsx`, `app/morning.tsx`, `app/evening.tsx`）を使用している。どのファイルからもインポートされていない |
| **影響分析** | `PhaseGuard.tsx` は `tabs_backup` でのみ使用されていたが、`PhaseGuard.tsx` 自体はR1-2ではなくR3で対応する（現在のプロダクションコードからのインポートが無いことを確認済み） |
| **テスト検証方法** | `npm test` 全テストパス確認 |
| **複雑度** | **S** |

### タスク R1-3: 孤立したNotificationManager削除

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/core/NotificationManager.ts` (81行) |
| **修正内容** | ファイルを完全削除する |
| **理由** | インポートゼロ。完全に孤立したデッドコード。通知機能は `src/notifications/NotificationScheduler.ts` と `src/notifications/NotificationHandler.ts` が担当しており、完全に置き換え済み |
| **影響分析** | プロダクションコードへの影響ゼロ。テストファイルも存在しない |
| **注意** | `src/core/NotificationController.tsx` は `app/_layout.tsx` が使用中であり、これは **削除対象ではない**。名前が似ているため混同に注意 |
| **テスト検証方法** | `npm test` 全テストパス確認 |
| **複雑度** | **S** |

### タスク R1-4: WipeAnimation.ts の置換

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/core/WipeAnimation.ts` (37行) |
| **修正内容** | `WipeAnimation.executeWipe()` の実装を `WipeManager.executeWipe()` に委譲するよう書き換える。具体的には: |
| | 1. 存在しないテーブル参照（`anti_vision`, `identity_core`, `daily_judgments`, `user_status`）を削除 |
| | 2. `WipeManager` をインスタンス化し、`executeWipe('IH_ZERO', 0)` を呼び出す |
| | 3. `WipeAnimation` のAPIシグネチャは維持する（`app/death.tsx` の互換性のため） |
| **理由** | 現在のスキーマ（`identity`, `quests`, `notifications`, `daily_state`）と完全に乖離したテーブル名を参照している。実行すると `DROP TABLE IF EXISTS` は空振りし、`UPDATE user_status` はエラーになる |
| **影響分析** | `app/death.tsx` (行84) と `app/death.test.tsx` が使用中。APIシグネチャを維持することで呼び出し側の変更を不要にする |
| **テスト検証方法** | `app/death.test.tsx` のテストパス確認。WipeAnimation経由でWipeManagerが正しく呼ばれることを確認する新規テスト追加を推奨 |
| **複雑度** | **M** |

### タスク R1-5: scripts/reset-db.ts の修正

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `scripts/reset-db.ts` (26行) |
| **修正内容** | 2つの選択肢: |
| | **Option A（推奨）**: 削除する。`scripts/reset-ih.ts` がデバッグ用途でIdentityEngineを経由したリセット機能を持っており、役割が重複している |
| | **Option B**: `client.ts` からのインポートに書き換え、`getDB()` を使った正しいリセットロジックに修正する |
| **理由** | R1-1で削除される `db.ts` からインポートしており、実行不可能なスクリプトである |
| **影響分析** | 開発用スクリプトのみ。プロダクションコードへの影響ゼロ |
| **テスト検証方法** | テストなし（開発スクリプト） |
| **複雑度** | **S** |

---

## Phase R2: コード統一・品質向上

### タスク R2-1: OnboardingFlow.tsx のconsole.log除去

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/ui/screens/onboarding/OnboardingFlow.tsx` (540行) |
| **修正内容** | 22箇所の `console.log` デバッグ文を全て削除する |
| **対象箇所** | 行39, 41, 43, 47, 50, 52, 54, 58, 61, 63, 65, 70, 78, 351, 355, 357, 376, 379, 389 および残余箇所 |
| **理由** | `[useEffect]`, `[renderStep]`, `[render]` プレフィックスの開発デバッグログが大量に残存しており、プロダクションビルドのパフォーマンスに影響し、コードの可読性を低下させている |
| **影響分析** | ログ出力のみの削除であり、ロジックへの影響ゼロ |
| **テスト検証方法** | `npm test -- src/ui/screens/onboarding/OnboardingFlow.test.tsx` パス確認 |
| **複雑度** | **S** |

### タスク R2-2: プロダクションコード全体のconsole.log除去

| 項目 | 内容 |
|------|------|
| **対象ファイル** | 以下のファイルから `console.log` を削除: |
| | - `src/core/identity/IdentityEngine.ts` (行372: 1箇所) |
| | - `src/database/client.ts` (行31: 1箇所) |
| | - `app/morning.tsx` (行50: 1箇所) |
| | - `app/index.tsx` (行83, 97: 2箇所) |
| **修正内容** | 全 `console.log` を削除する。`app/index.tsx` の行97 `console.log` はcatchブロック内であり、`console.error` への変更も検討可能だが、ブルータリストの「エラーも沈黙」原則に従い削除を推奨 |
| **理由** | プロダクションコードにデバッグログを残すべきではない |
| **影響分析** | ログ出力のみの削除。ロジックへの影響ゼロ |
| **注意** | `console.error` は意図的なエラーログとして残す場合がある（例: `WipeManager.ts` 行110）。削除対象は `console.log` のみ |
| **テスト検証方法** | `npm test` 全テストパス確認 |
| **複雑度** | **S** |

### タスク R2-3: .demoファイルのconsole.log除去

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/ui/screens/onboarding/LensSyncPhase.demo.tsx` (行12), `src/ui/screens/onboarding/CovenantPhase.demo.tsx` (行17) |
| **修正内容** | デモファイル内の `console.log` を削除する。もしくはR3-4（.demoファイル整理）で一括削除する場合、このタスクはスキップ可能 |
| **理由** | デモファイル自体がR3-4で削除候補のため、優先度低 |
| **影響分析** | 影響ゼロ |
| **テスト検証方法** | 不要 |
| **複雑度** | **S** |

### タスク R2-4: カラーシステム統一 (colors.ts → theme.ts)

| 項目 | 内容 |
|------|------|
| **対象ファイル** | 以下の17ファイルで `Colors` を `theme.colors` に置換: |
| | **src/ 内 (11ファイル):** |
| | - `src/ui/lenses/IdentityLens.tsx` |
| | - `src/ui/lenses/MissionLens.tsx` |
| | - `src/ui/lenses/QuestLens.tsx` |
| | - `src/ui/lenses/LensContents.tsx` |
| | - `src/ui/effects/AntiVisionBleed.tsx` |
| | - `src/ui/effects/GlitchText.tsx` (effects版) |
| | - `src/ui/effects/AntiVisionFragments.tsx` |
| | - `src/ui/effects/FileDeleteAnimation.tsx` |
| | - `src/ui/components/ThemedText.tsx` |
| | - `src/ui/layout/StressContainer.tsx` |
| | - `src/ui/screens/SystemRejectionScreen.tsx` |
| | **app/ 内 (6ファイル):** |
| | - `app/death.tsx` |
| | - `app/evening.tsx` |
| | - `app/_layout.tsx` |
| | - `app/judgment.tsx` |
| | - `app/morning.tsx` |
| | - `app/index.tsx` |
| **修正内容** | 各ファイルで以下を実施: |
| | 1. `import { Colors } from '../theme/colors'` を `import { theme } from '../theme/theme'` に変更（app/内は `'../src/ui/theme/theme'`） |
| | 2. `Colors.dark.background` → `theme.colors.background` |
| | 3. `Colors.dark.text` → `theme.colors.foreground` |
| | 4. `Colors.dark.error` → `theme.colors.error` |
| | 5. `Colors.dark.accent` → `theme.colors.accent` |
| | 6. `Colors.dark.secondary` → `'#A1A1AA'`（theme.tsに`secondary`が存在しないため、直接値を使用するか、theme.tsに追加する） |
| | 7. `Colors.dark.primary` → `theme.colors.foreground` |
| | 8. `Colors.dark.surface` → `'#202020'`（同様） |
| | 9. `Colors.dark.success` → `theme.colors.ih.high` |
| | 10. `Colors.dark.warning` → `theme.colors.warning` |
| **カラーマッピング表** | |

```
┌─────────────────────────┬──────────────────────────────┬─────────┐
│ colors.ts (旧)          │ theme.ts (新)                │ 値      │
├─────────────────────────┼──────────────────────────────┼─────────┤
│ Colors.dark.background  │ theme.colors.background      │ #000000 │
│ Colors.dark.text        │ theme.colors.foreground       │ #FFFFFF │
│ Colors.dark.tint        │ theme.colors.foreground       │ #FFFFFF │
│ Colors.dark.primary     │ theme.colors.foreground       │ #FFFFFF │
│ Colors.dark.accent      │ theme.colors.accent           │ #FF0000 │
│ Colors.dark.error       │ theme.colors.error            │ #FF0000 │
│ Colors.dark.warning     │ theme.colors.warning          │ #FFBF00 │
│ Colors.dark.secondary   │ (theme拡張必要)               │ #A1A1AA │
│ Colors.dark.surface     │ (theme拡張必要)               │ #202020 │
│ Colors.dark.success     │ theme.colors.ih.high          │ #4ADE80 │
│ Colors.dark.icon        │ (theme拡張必要)               │ #9BA1A6 │
└─────────────────────────┴──────────────────────────────┴─────────┘
```

| **サブタスク R2-4a** | `theme.ts` に `secondary`, `surface`, `icon` カラーを追加する。Theme interfaceの `Colors` 型も拡張する |
| **サブタスク R2-4b** | 17ファイルのimportとカラー参照を一括置換する |
| **サブタスク R2-4c** | `src/ui/theme/colors.ts` を削除する |
| **理由** | `colors.ts` 自体のコメントに「For new code, prefer importing { theme } from './theme'」と明記されており、レガシーとして認識されている。背景色も `#151718` vs `#000000` と乖離しており、ブルータリストデザインの一貫性を損なっている |
| **影響分析** | UIの見た目が変わる可能性がある。`Colors.dark.background` (`#151718`) を使用しているファイルは `theme.colors.background` (`#000000`) に変わる。これはブルータリストデザイン原則への統一であり意図的 |
| **テスト検証方法** | `npm test` 全テストパス確認。`src/ui/theme/theme.test.ts` でカラー値テストを追加。実機/シミュレータでの視覚確認を推奨 |
| **複雑度** | **L** |

### タスク R2-5: importパターン統一 (@/ → 相対パス)

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/notifications/NotificationScheduler.ts` (行7), `src/ui/components/PhaseGuard.tsx` (行10) |
| **修正内容** | |
| | - `NotificationScheduler.ts`: `import { REFLECTION_QUESTIONS, NOTIFICATION_SCHEDULE } from '@/constants'` → `import { REFLECTION_QUESTIONS, NOTIFICATION_SCHEDULE } from '../../constants'` |
| | - `PhaseGuard.tsx`: `import { PHASE_TIMES } from '@/constants'` → `import { PHASE_TIMES } from '../../constants'` |
| **理由** | プロジェクト内の約100ファイルが相対パスを使用しているのに対し、`@/` エイリアスは2ファイルのみ。統一するなら多数派に合わせるのが合理的 |
| **影響分析** | import解決パスの変更のみ。ランタイム動作に変更なし |
| **テスト検証方法** | `npm test` 全テストパス確認 |
| **複雑度** | **S** |

### タスク R2-6: 重複GlitchTextコンポーネント削除

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/ui/components/GlitchText.tsx` (183行), `src/ui/components/GlitchText.test.tsx` (613行) |
| **修正内容** | `src/ui/components/GlitchText.tsx` と `src/ui/components/GlitchText.test.tsx` を削除する |
| **理由** | `src/ui/effects/GlitchText.tsx` (121行) + `src/ui/effects/GlitchText.test.tsx` (92行) が現在のアクティブな実装である。`effects/index.ts` がエクスポートしているのは `effects/GlitchText` であり、`components/GlitchText` はバレルファイルにも含まれていない |
| **影響分析** | `PhaseGuard.tsx` が `import { GlitchText } from './GlitchText'` でcomponents版を使用している。ただしPhaseGuard.tsx自体がR1-2（tabs_backup削除）後に孤立する可能性が高い。PhaseGuardの処遇はR3-5で判断する |
| **依存チェック** | PhaseGuard.tsx のインポート先を確認し、effects版への切り替えが必要な場合は先に対応する |
| **テスト検証方法** | `npm test` 全テストパス確認。削除されるテスト613行分のカバレッジ減少を確認 |
| **複雑度** | **M** |

### タスク R2-7: レガシーIdentityEngine.test.ts削除

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/core/IdentityEngine.test.ts` (252行) |
| **修正内容** | ファイルを削除する |
| **理由** | `src/core/identity/IdentityEngine.test.ts` が現在のアクティブなテストファイルである。`src/core/IdentityEngine.test.ts` は旧パスの重複テストであり、テスト内容もidentity/版と重複している |
| **影響分析** | テスト件数が減少するが、identity/版が同等以上のカバレッジを提供している |
| **テスト検証方法** | `npm test` 全テストパス確認。カバレッジレポートでIdentityEngineのカバレッジが維持されていることを確認 |
| **複雑度** | **S** |

### タスク R2-8: .serena/ を .gitignore に追加

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `.gitignore` |
| **修正内容** | 以下を追加: |
| | ```gitignore |
| | # Serena MCP |
| | .serena/ |
| | ``` |
| **理由** | `.serena/` はSerena MCPの設定・キャッシュディレクトリであり、バージョン管理すべきではない |
| **影響分析** | なし |
| **テスト検証方法** | 不要 |
| **複雑度** | **S** |

---

## Phase R3: アーキテクチャ整理

### タスク R3-1: app/death.tsx の WipeAnimation依存を WipeManagerに置換

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `app/death.tsx` (273行), `app/death.test.tsx` |
| **修正内容** | R1-4でWipeAnimationの内部実装をWipeManagerに委譲した後、death.tsxでは追加変更不要。ただし将来的にはWipeAnimationを完全に廃止し、death.tsxがWipeManagerを直接使用するよう変更することを推奨する |
| **サブタスク R3-1a** | `FILES_TO_DELETE` 配列（行14-19）の値を現在のスキーマに合わせる: `['identity.db', 'quests.db', 'notifications.db', 'daily_state.db']` |
| **サブタスク R3-1b** | `WipeAnimation` importを削除し、`WipeManager` を直接使用するよう書き換える |
| **理由** | WipeAnimationはラッパーとしての価値がなく、間接参照を増やすだけである |
| **影響分析** | death.tsx と death.test.tsx のみ |
| **テスト検証方法** | `npm test -- app/death.test.tsx` パス確認。ワイプシーケンスが正常に動作することを確認 |
| **複雑度** | **M** |

### タスク R3-2: WipeAnimation.ts の完全削除

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/core/WipeAnimation.ts` (37行) |
| **修正内容** | R3-1完了後にファイルを削除する |
| **依存関係** | R3-1が先に完了していること |
| **理由** | R3-1でdeath.tsxがWipeManagerを直接使用するようになれば、WipeAnimationは不要になる |
| **影響分析** | R3-1で依存を除去済みであれば影響ゼロ |
| **テスト検証方法** | `npm test` 全テストパス確認 |
| **複雑度** | **S** |

### タスク R3-3: 未使用バレルindex.ts整理

| 項目 | 内容 |
|------|------|
| **対象ファイル** | 以下の4ファイル: |
| | - `src/ui/screens/index.ts` (12行) |
| | - `src/ui/effects/index.ts` (11行) |
| | - `src/ui/screens/onboarding/index.ts` (17行) |
| | - `src/ui/screens/quest/index.ts` (13行) |
| **修正内容** | 2つの選択肢: |
| | **Option A（推奨）**: 全て削除する。現在どのファイルからもインポートされておらず、デッドコードである |
| | **Option B**: 残して将来のモジュール整理に活用する。ただし現時点で全ての消費者が直接パスでインポートしているため、活用される見込みが低い |
| **理由** | バレルファイルが存在するのに使用されていない状態は、コードベースのメンテナーにとって混乱の原因になる |
| **影響分析** | プロダクションコードへの影響ゼロ |
| **テスト検証方法** | `npm test` 全テストパス確認 |
| **複雑度** | **S** |

### タスク R3-4: .demo.tsx ファイル削除

| 項目 | 内容 |
|------|------|
| **対象ファイル** | 以下の3ファイル: |
| | - `src/ui/screens/onboarding/CovenantPhase.demo.tsx` |
| | - `src/ui/screens/onboarding/ExcavationPhase.demo.tsx` |
| | - `src/ui/screens/onboarding/LensSyncPhase.demo.tsx` |
| **修正内容** | 全ファイルを削除する |
| **理由** | 開発時のデモ/プレビュー用アーティファクトであり、テストでもプロダクションでも使用されていない |
| **影響分析** | 影響ゼロ |
| **テスト検証方法** | `npm test` 全テストパス確認 |
| **複雑度** | **S** |

### タスク R3-5: PhaseGuard.tsx の処遇判断

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/ui/components/PhaseGuard.tsx` (177行) |
| **修正内容** | 2つの選択肢: |
| | **Option A**: 削除する。R1-2で `tabs_backup` を削除した後、PhaseGuardは孤立する。現在のapp/morning.tsx や app/evening.tsx はPhaseGuardを使用していない |
| | **Option B（推奨）**: 保持する。Phase制限はCLAUDE.mdの仕様に明記されている重要機能であり、将来的にapp/morning.tsx, app/evening.tsx に組み込む予定がある可能性が高い。ただしcomponents版GlitchTextへの依存をeffects版に切り替える必要がある |
| **理由** | 仕様書に「MORNING (6:00-12:00), EVENING (18:00-24:00)」の時間制限が明記されており、今後実装される可能性がある |
| **影響分析** | Option B選択時: GlitchTextのimportパス変更のみ |
| **テスト検証方法** | PhaseGuardのテストが存在しない場合は新規テスト作成を推奨 |
| **複雑度** | **S** |

### タスク R3-6: 孤立型定義ファイルの整理

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `src/types/identity.ts` (25行), `src/types/notification.ts` (23行), `src/types/phase.ts` (17行) |
| **修正内容** | 各型定義が実際にインポートされているか確認し、未使用なら削除する。使用されている場合は、使用元のモジュール近くに移動（colocation）することを推奨 |
| **確認方法** | `grep -r "from.*types/identity" src/`, `grep -r "from.*types/notification" src/`, `grep -r "from.*types/phase" src/` |
| **理由** | 型定義がモジュールから離れた場所に存在すると、コードナビゲーションと保守性が低下する |
| **影響分析** | 型のみの変更でランタイム影響ゼロ |
| **テスト検証方法** | TypeScriptコンパイル成功確認 |
| **複雑度** | **S** |

### タスク R3-7: 大ファイル分割（将来タスク）

| 項目 | 内容 |
|------|------|
| **対象ファイル** | 以下の4ファイル: |
| | - `src/core/onboarding/OnboardingManager.ts` (546行) |
| | - `src/ui/screens/onboarding/OnboardingFlow.tsx` (540行) |
| | - `src/core/identity/IdentityEngine.ts` (454行) |
| | - `app/index.tsx` (391行) |
| **修正内容** | 各ファイルの責務を分析し、適切な粒度に分割する。具体的な分割案は実装計画で別途策定する |
| **分割方針案** | |
| | - `OnboardingManager.ts`: バリデーション、ステップ管理、DB操作を分離 |
| | - `OnboardingFlow.tsx`: 各ステップのレンダリングを個別コンポーネントに抽出（既にExcavation/Covenant/LensSync/JudgmentPhaseとして一部分離済み） |
| | - `IdentityEngine.ts`: IH計算、ペナルティ、保険機能を分離 |
| | - `app/index.tsx`: UIとデータ取得ロジックを分離 |
| **理由** | 500行超のファイルは可読性と保守性を低下させる |
| **影響分析** | 内部リファクタリングのみだが、テストの大幅な書き換えが必要になる可能性がある |
| **テスト検証方法** | 全テストパス確認。カバレッジの維持 |
| **複雑度** | **L** |

---

## Phase R4: ドキュメント・設定整備

### タスク R4-1: 旧ドキュメント整理

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `docs/` ディレクトリ内の27ファイル |
| **修正内容** | 以下のカテゴリに分類し、不要なものを削除またはアーカイブする: |
| | **削除候補（現在の方針と矛盾）:** |
| | - `docs/web-support-implementation-plan.md` — Web版は明示的に無効化済み |
| | - `docs/disable-web-support-plan.md` — 実施完了 |
| | - `docs/disable-web-support-plan-v2.md` — 実施完了 |
| | **アーカイブ候補（旧バージョン）:** |
| | - `docs/implementation-plan-v1.md` → v1.1に上書き済み |
| | - `docs/implementation-plan-v1-review.md` → v1.1-reviewに上書き済み |
| | - `docs/critical-fix-plan-v1.0.md`, `v1.0-review.md` → v1.1, v1.2に上書き済み |
| | - `docs/critical-fix-plan-v1.1.md`, `v1.1-review.md` → v1.2に上書き済み |
| | - `docs/dependency-fix-plan-v1.0.md` → v1.1に上書き済み |
| | - `docs/ux-complete-implementation-plan.md` → v1.1に上書き済み |
| | - `docs/ux-complete-implementation-plan-REVIEW.md` → 実施完了 |
| | - `docs/punishment-haptic-improvement-plan.md` → v1.1に上書き済み |
| | **保持:** |
| | - `docs/idea.md` — 原案（参照価値あり） |
| | - `docs/implementation-plan-v1.1.md` — 最新の実装計画 |
| | - `docs/implementation-plan-v1.1-review.md` — 最新のレビュー |
| | - 各最新バージョンのドキュメント |
| **理由** | 27ファイル中13ファイルが旧バージョンで上書き済みであり、開発者の混乱を招く |
| **影響分析** | ドキュメントのみ。コードへの影響ゼロ |
| **テスト検証方法** | 不要 |
| **複雑度** | **M** |

### タスク R4-2: lint/typecheck npmスクリプト追加

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `package.json` |
| **修正内容** | 以下のスクリプトを追加: |
| | ```json |
| | "lint": "npx tsc --noEmit", |
| | "typecheck": "npx tsc --noEmit" |
| | ``` |
| | 将来的にESLint導入時は `"lint"` を置き換える |
| **理由** | 現在 `npm run lint` も `npm run typecheck` も未定義であり、CI/CDパイプラインでの型チェック自動化ができない |
| **影響分析** | package.json のみ。既存スクリプトへの影響ゼロ |
| **テスト検証方法** | `npm run typecheck` が正常終了することを確認 |
| **複雑度** | **S** |

### タスク R4-3: scripts/reset-ih.ts のクリーンアップ

| 項目 | 内容 |
|------|------|
| **対象ファイル** | `scripts/reset-ih.ts` (23行) |
| **修正内容** | 2つの選択肢: |
| | **Option A**: `(global as any)` の行（行20-22）を削除し、エクスポートのみを残す |
| | **Option B（推奨）**: ファイル全体を削除する。デバッグ用スクリプトであり、__DEV__ガード付きのアプリ内デバッグ機能（app/death.tsxの行158-162にDEVボタンが既に存在）で十分 |
| **理由** | `(global as any)` パターンは型安全性を破壊し、デバッグアーティファクトとしてプロダクションコードに混入するリスクがある |
| **影響分析** | 開発用スクリプトのみ |
| **テスト検証方法** | 不要 |
| **複雑度** | **S** |

### タスク R4-4: `as any` キャストの段階的解消

| 項目 | 内容 |
|------|------|
| **対象ファイル** | プロダクションコード4箇所: |
| | - `src/notifications/NotificationScheduler.ts` (行111): Expoの型不整合 |
| | - `src/core/NotificationManager.ts` (行74): 同上（R1-3で削除予定） |
| **修正内容** | |
| | - `NotificationScheduler.ts`: Expo Notificationsの型定義を調査し、正しい型アサーションに置換する。不可能な場合は `// eslint-disable-next-line @typescript-eslint/no-explicit-any` コメントで意図を明示 |
| | - テストコード26箇所: テスト用のモック型定義を作成し、`as any` を `as MockDB` 等の型安全なキャストに置換する |
| **理由** | `as any` は型安全性を無効化し、リファクタリング時に型エラーを検出できなくなる |
| **影響分析** | 型のみの変更。ランタイム影響ゼロ |
| **テスト検証方法** | `npm test` 全テストパス確認。`npm run typecheck` 成功確認 |
| **複雑度** | **M** |

---

## 依存関係グラフ

```
Phase R1 (デッドコード除去)
├── R1-1: db.ts + db.test.ts 削除
│   └── R1-5: reset-db.ts 修正 (R1-1 に依存)
├── R1-2: tabs_backup 削除
├── R1-3: NotificationManager 削除
└── R1-4: WipeAnimation 修正
    └── Phase R3
        ├── R3-1: death.tsx WipeManager直接使用 (R1-4 に依存)
        │   └── R3-2: WipeAnimation 完全削除 (R3-1 に依存)
        └── ...

Phase R2 (コード品質) ← R1完了後に開始
├── R2-1: OnboardingFlow console.log除去
├── R2-2: 他ファイル console.log除去
├── R2-3: .demo console.log除去
├── R2-4: カラーシステム統一
│   ├── R2-4a: theme.ts拡張
│   ├── R2-4b: 17ファイルのimport置換 (R2-4a に依存)
│   └── R2-4c: colors.ts削除 (R2-4b に依存)
├── R2-5: importパターン統一
├── R2-6: 重複GlitchText削除
│   └── R3-5: PhaseGuard処遇 (R2-6 に依存)
├── R2-7: レガシーIdentityEngine.test.ts削除
└── R2-8: .serena/ → .gitignore

Phase R3 (アーキテクチャ) ← R2完了後に開始
├── R3-1 → R3-2 (上記)
├── R3-3: バレルindex.ts整理
├── R3-4: .demo.tsx削除
├── R3-5: PhaseGuard処遇 (R2-6 に依存)
├── R3-6: 孤立型定義整理
└── R3-7: 大ファイル分割 (独立、最後に実施)

Phase R4 (設定整備) ← R1-R3と並行可能
├── R4-1: 旧docs整理
├── R4-2: npm scripts追加
├── R4-3: reset-ih.ts クリーンアップ
└── R4-4: as any 解消
```

### クリティカルパス

```
R1-4 → R3-1 → R3-2 (WipeAnimation完全置換フロー)
R2-4a → R2-4b → R2-4c (カラーシステム統一フロー)
```

---

## リスクアセスメント

### 高リスク

| タスク | リスク | 軽減策 |
|--------|--------|--------|
| R2-4 (カラー統一) | UI見た目の意図しない変化。`#151718` → `#000000` は背景色の変更を伴う | 実機/シミュレータでの全画面視覚確認。スクリーンショット比較 |
| R1-4/R3-1 (WipeAnimation置換) | ワイプ処理の破壊。誤った実装でデータ消失ロジックが壊れる | death.test.tsx の既存テスト + 新規統合テストで完全カバー |
| R3-7 (大ファイル分割) | テストの大幅書き換えが必要。分割後のモジュール間インターフェースの設計ミス | 詳細な分割設計書を別途作成。テストを先に書き換えてからリファクタリング |

### 中リスク

| タスク | リスク | 軽減策 |
|--------|--------|--------|
| R2-6 (GlitchText削除) | PhaseGuardのGlitchText依存が壊れる | R3-5でPhaseGuardの処遇を先に決定する。削除前にimport先を確認 |
| R2-5 (importパターン統一) | パス解決エラーの可能性 | TypeScriptコンパイルで即座に検出可能 |

### 低リスク

| タスク | リスク | 軽減策 |
|--------|--------|--------|
| R1-1, R1-2, R1-3 (デッドコード削除) | 想定外の参照がある場合 | grep検索で全参照を事前確認済み |
| R4-1 (docs整理) | 必要なドキュメントの誤削除 | git履歴から復元可能 |
| R2-1, R2-2 (console.log除去) | なし | ログ出力のみで動作に影響なし |

---

## タスク一覧サマリー

| タスク | 内容 | 複雑度 | 依存 | Phase |
|--------|------|--------|------|-------|
| R1-1 | db.ts + db.test.ts 削除 | S | なし | R1 |
| R1-2 | tabs_backup 削除 | S | なし | R1 |
| R1-3 | NotificationManager 削除 | S | なし | R1 |
| R1-4 | WipeAnimation 修正 | M | なし | R1 |
| R1-5 | reset-db.ts 修正/削除 | S | R1-1 | R1 |
| R2-1 | OnboardingFlow console.log除去 | S | R1完了 | R2 |
| R2-2 | プロダクション console.log除去 | S | R1完了 | R2 |
| R2-3 | .demo console.log除去 | S | R1完了 | R2 |
| R2-4 | カラーシステム統一 | L | R1完了 | R2 |
| R2-5 | importパターン統一 | S | R1完了 | R2 |
| R2-6 | 重複GlitchText削除 | M | R1完了 | R2 |
| R2-7 | レガシーIdentityEngine.test.ts削除 | S | R1完了 | R2 |
| R2-8 | .serena/ → .gitignore | S | なし | R2 |
| R3-1 | death.tsx WipeManager直接使用 | M | R1-4 | R3 |
| R3-2 | WipeAnimation 完全削除 | S | R3-1 | R3 |
| R3-3 | バレルindex.ts整理 | S | R2完了 | R3 |
| R3-4 | .demo.tsx削除 | S | R2完了 | R3 |
| R3-5 | PhaseGuard処遇判断 | S | R2-6 | R3 |
| R3-6 | 孤立型定義整理 | S | R2完了 | R3 |
| R3-7 | 大ファイル分割 | L | R3完了 | R3 |
| R4-1 | 旧docs整理 | M | なし | R4 |
| R4-2 | npm scripts追加 | S | なし | R4 |
| R4-3 | reset-ih.ts クリーンアップ | S | なし | R4 |
| R4-4 | as any 解消 | M | R4-2 | R4 |

### 工数見積

| Phase | タスク数 | S | M | L | 推定工数 |
|-------|---------|---|---|---|---------|
| R1 | 5 | 4 | 1 | 0 | 1-2時間 |
| R2 | 8 | 5 | 2 | 1 | 3-5時間 |
| R3 | 7 | 5 | 1 | 1 | 3-5時間 |
| R4 | 4 | 2 | 2 | 0 | 1-2時間 |
| **合計** | **24** | **16** | **6** | **2** | **8-14時間** |

---

## 完了条件

リファクタリング完了時に以下の全条件を満たすこと:

- [ ] 全テストパス（595件以上 -- テストファイル削除分は減少許容）
- [ ] TypeScriptエラーゼロ（`npm run typecheck` 成功）
- [ ] 未使用ファイルゼロ（デッドコードなし）
- [ ] `console.log` ゼロ（プロダクションコードのみ。`console.error` は許容）
- [ ] 統一されたカラーシステム（`theme.ts` のみ、`colors.ts` 削除済み）
- [ ] 統一されたimportパターン（相対パスのみ、`@/` 不使用）
- [ ] `.serena/` が `.gitignore` に含まれている
- [ ] `WipeAnimation.ts` が削除され、`WipeManager` が直接使用されている
- [ ] レガシーDB（`db.ts`）およびバックアップ（`tabs_backup/`）が削除されている
- [ ] `npm run lint` / `npm run typecheck` スクリプトが動作する

### 検証コマンド

```bash
# テスト全パス
npm test

# TypeScript型チェック
npm run typecheck

# console.logの残存確認（プロダクションコードのみ）
grep -r "console\.log" src/ app/ --include="*.ts" --include="*.tsx" \
  | grep -v "\.test\." | grep -v "\.demo\." | grep -v "node_modules"

# Colors import残存確認
grep -r "from.*colors" src/ app/ --include="*.ts" --include="*.tsx"

# @/ import残存確認
grep -r "from '@/" src/ --include="*.ts" --include="*.tsx"

# as any 残存確認（プロダクションコードのみ）
grep -r "as any" src/ app/ --include="*.ts" --include="*.tsx" \
  | grep -v "\.test\." | grep -v "node_modules"

# 削除対象ファイルの不在確認
[ ! -f src/database/db.ts ] && echo "OK: db.ts deleted"
[ ! -d app/tabs_backup ] && echo "OK: tabs_backup deleted"
[ ! -f src/core/NotificationManager.ts ] && echo "OK: NotificationManager deleted"
[ ! -f src/core/WipeAnimation.ts ] && echo "OK: WipeAnimation deleted"
[ ! -f src/ui/theme/colors.ts ] && echo "OK: colors.ts deleted"
```

---

## 付録: ファイル影響マトリクス

| ファイル | R1 | R2 | R3 | R4 | 操作 |
|---------|----|----|----|----|------|
| `src/database/db.ts` | R1-1 | | | | 削除 |
| `src/database/db.test.ts` | R1-1 | | | | 削除 |
| `app/tabs_backup/*` (4) | R1-2 | | | | 削除 |
| `src/core/NotificationManager.ts` | R1-3 | | | | 削除 |
| `src/core/WipeAnimation.ts` | R1-4 | | R3-2 | | 修正→削除 |
| `scripts/reset-db.ts` | R1-5 | | | | 削除 |
| `src/ui/screens/onboarding/OnboardingFlow.tsx` | | R2-1 | R3-7 | | 修正 |
| `src/core/identity/IdentityEngine.ts` | | R2-2 | R3-7 | | 修正 |
| `src/database/client.ts` | | R2-2 | | | 修正 |
| `app/morning.tsx` | | R2-2, R2-4 | | | 修正 |
| `app/index.tsx` | | R2-2, R2-4 | R3-7 | | 修正 |
| `src/ui/theme/colors.ts` | | R2-4c | | | 削除 |
| `src/ui/theme/theme.ts` | | R2-4a | | | 修正 |
| `src/ui/lenses/*.tsx` (4) | | R2-4b | | | 修正 |
| `src/ui/effects/*.tsx` (4) | | R2-4b | | | 修正 |
| `src/ui/components/ThemedText.tsx` | | R2-4b | | | 修正 |
| `src/ui/layout/StressContainer.tsx` | | R2-4b | | | 修正 |
| `src/ui/screens/SystemRejectionScreen.tsx` | | R2-4b | | | 修正 |
| `app/death.tsx` | | R2-4b | R3-1 | | 修正 |
| `app/evening.tsx` | | R2-4b | | | 修正 |
| `app/_layout.tsx` | | R2-4b | | | 修正 |
| `app/judgment.tsx` | | R2-4b | | | 修正 |
| `src/notifications/NotificationScheduler.ts` | | R2-5 | | R4-4 | 修正 |
| `src/ui/components/PhaseGuard.tsx` | | R2-5 | R3-5 | | 修正 |
| `src/ui/components/GlitchText.tsx` | | R2-6 | | | 削除 |
| `src/ui/components/GlitchText.test.tsx` | | R2-6 | | | 削除 |
| `src/core/IdentityEngine.test.ts` | | R2-7 | | | 削除 |
| `.gitignore` | | R2-8 | | | 修正 |
| `src/ui/screens/index.ts` | | | R3-3 | | 削除 |
| `src/ui/effects/index.ts` | | | R3-3 | | 削除 |
| `src/ui/screens/onboarding/index.ts` | | | R3-3 | | 削除 |
| `src/ui/screens/quest/index.ts` | | | R3-3 | | 削除 |
| `*.demo.tsx` (3) | | | R3-4 | | 削除 |
| `src/types/*.ts` (3) | | | R3-6 | | 判断 |
| `docs/*` (旧版) | | | | R4-1 | 削除 |
| `package.json` | | | | R4-2 | 修正 |
| `scripts/reset-ih.ts` | | | | R4-3 | 削除 |

---

*作成日: 2026-02-08*
*対象コミット: 1be7c34 (main)*
*テスト状態: 35スイート / 595テスト 全パス / TSエラーゼロ*
