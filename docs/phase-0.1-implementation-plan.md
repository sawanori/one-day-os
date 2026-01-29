# Phase 0.1 Implementation Plan
## FIVE_QUESTIONS Unification and Japanese Translation

### Date
2026-01-28

### Objective
Centrally manage FIVE_QUESTIONS in `src/constants/index.ts` and translate all questions to Japanese.

---

## Current State Analysis

### src/constants/index.ts (Lines 35-41)
```typescript
export const FIVE_QUESTIONS = [
  "Who are you?",
  "What are you doing?",
  "Why are you doing this?",
  "Is this aligned with your identity?",
  "What will you do next?",
] as const;
```
- **Status:** 5 questions in English
- **Issue:** Need to expand to 6 questions and translate to Japanese

### src/notifications/NotificationScheduler.ts (Lines 9-15)
```typescript
const FIVE_QUESTIONS = [
  { hour: 11, minute: 0, question: '何を避けようとしているか？' },
  { hour: 13, minute: 30, question: '観察者は君を「何を望んでいる人間」と結論づけるか？' },
  { hour: 15, minute: 15, question: '嫌いな人生か、欲しい人生か？' },
  { hour: 17, minute: 0, question: '重要でないふりをしている「最重要のこと」は？' },
  { hour: 19, minute: 30, question: '今日の行動は本当の欲求か、自己防衛か？' },
] as const;
```
- **Status:** Local definition with 5 different Japanese questions + time scheduling
- **Issue:** This creates duplication and inconsistency with central constants

### NOTIFICATION_SCHEDULE.TIMES (Lines 23-30)
```typescript
export const NOTIFICATION_SCHEDULE = {
  TIMES: [
    { hour: 6, minute: 0 },   // 06:00
    { hour: 9, minute: 0 },   // 09:00
    { hour: 12, minute: 0 },  // 12:00
    { hour: 15, minute: 0 },  // 15:00
    { hour: 18, minute: 0 },  // 18:00
    { hour: 21, minute: 0 },  // 21:00
  ],
  TIMEOUT_MS: IH_CONSTANTS.NOTIFICATION_TIMEOUT_MINUTES * 60 * 1000,
} as const;
```
- **Status:** Already has 6 notification times defined
- **Good:** This matches the requirement for 6 daily notifications

---

## Problem Identification

### Critical Issues
1. **Inconsistent Question Count:** Constants define 5 questions, but NOTIFICATION_SCHEDULE has 6 times
2. **Duplicate Definition:** NotificationScheduler has its own FIVE_QUESTIONS with different content
3. **Time Mismatch:** NotificationScheduler uses different times (11:00, 13:30, etc.) vs NOTIFICATION_SCHEDULE (6:00, 9:00, etc.)
4. **Language Inconsistency:** Constants are in English, NotificationScheduler is in Japanese

### Architecture Violations
- **Single Source of Truth Violation:** Two different definitions of "five questions"
- **Constants Not Used:** NOTIFICATION_SCHEDULE.TIMES is defined but not imported/used in NotificationScheduler

---

## Implementation Strategy

### Phase 0.1 Breakdown

#### Step 1: Update src/constants/index.ts
**File:** `/Users/noritakasawada/AI_P/one-day-os/src/constants/index.ts`

**Changes:**
1. Rename `FIVE_QUESTIONS` to reflect 6 questions (or keep name for consistency)
2. Expand to 6 questions
3. Translate all questions to Japanese

**New Implementation:**
```typescript
// Five Questions for Notifications (6 questions, despite the name)
export const FIVE_QUESTIONS = [
  "あなたは誰か？",
  "あなたは何をしているか？",
  "なぜそれをしているのか？",
  "それはあなたのアイデンティティと一致しているか？",
  "次に何をするか？",
  "何を避けようとしているか？",
] as const;
```

**Rationale:**
- Keeping name `FIVE_QUESTIONS` for consistency with existing codebase
- Adding 6th question: "何を避けようとしているか？" (What are you trying to avoid?)
- All questions now in Japanese for brutalist authenticity

#### Step 2: Update src/notifications/NotificationScheduler.ts
**File:** `/Users/noritakasawada/AI_P/one-day-os/src/notifications/NotificationScheduler.ts`

**Changes:**

1. **Remove local FIVE_QUESTIONS definition (lines 9-15)**
2. **Add imports from constants:**
   ```typescript
   import { FIVE_QUESTIONS, NOTIFICATION_SCHEDULE } from '@/constants';
   ```
3. **Update scheduleDailyNotifications() method:**

**Current Implementation (lines 98-122):**
```typescript
async scheduleDailyNotifications(): Promise<string[]> {
  await this.ensurePermissions();
  const notificationIds: string[] = [];

  for (const { hour, minute, question } of FIVE_QUESTIONS) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: question,
        categoryIdentifier: CATEGORY_IDENTIFIER,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      } as any,
    });

    notificationIds.push(notificationId);
  }

  return notificationIds;
}
```

**New Implementation:**
```typescript
async scheduleDailyNotifications(): Promise<string[]> {
  await this.ensurePermissions();
  const notificationIds: string[] = [];

  // Schedule notifications at predefined times with corresponding questions
  for (let i = 0; i < NOTIFICATION_SCHEDULE.TIMES.length; i++) {
    const { hour, minute } = NOTIFICATION_SCHEDULE.TIMES[i];
    const question = FIVE_QUESTIONS[i % FIVE_QUESTIONS.length]; // Wrap if needed

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: question,
        categoryIdentifier: CATEGORY_IDENTIFIER,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      } as any,
    });

    notificationIds.push(notificationId);
  }

  return notificationIds;
}
```

**Rationale:**
- Uses NOTIFICATION_SCHEDULE.TIMES (6:00, 9:00, 12:00, 15:00, 18:00, 21:00)
- Maps questions from FIVE_QUESTIONS array in order
- Uses modulo operator to handle any mismatch (though both should have 6 items)

---

## Edge Cases & Error Handling

### 1. Array Length Mismatch
**Scenario:** NOTIFICATION_SCHEDULE.TIMES has 6 items, FIVE_QUESTIONS has 6 items
**Handling:** Using `i % FIVE_QUESTIONS.length` ensures wrapping if mismatch occurs
**Risk:** Low (both arrays have same length)

### 2. Type Safety
**Issue:** `as const` assertion maintains type safety
**Handling:** Both arrays use `as const` for immutability
**Risk:** None

### 3. Import Path Resolution
**Issue:** Module alias `@/constants` must resolve correctly
**Handling:** Already configured in tsconfig.json with `@/*` = `./src/*`
**Risk:** None (already working in other parts of codebase)

---

## Testing Strategy

### Unit Tests Required
1. **src/constants/index.ts**
   - Verify FIVE_QUESTIONS exports 6 questions
   - Verify all questions are strings
   - Verify all questions are in Japanese

2. **src/notifications/NotificationScheduler.ts**
   - Verify scheduleDailyNotifications() schedules 6 notifications
   - Verify notification times match NOTIFICATION_SCHEDULE.TIMES
   - Verify notification titles match FIVE_QUESTIONS
   - Verify no local FIVE_QUESTIONS definition exists

### Integration Tests Required
- Verify notification scheduling uses correct times (6:00, 9:00, 12:00, 15:00, 18:00, 21:00)
- Verify notification content displays Japanese questions

---

## Rollback Strategy

### If Implementation Fails
1. **Revert constants/index.ts:**
   ```bash
   git checkout HEAD -- src/constants/index.ts
   ```

2. **Revert NotificationScheduler.ts:**
   ```bash
   git checkout HEAD -- src/notifications/NotificationScheduler.ts
   ```

3. **Run tests to verify original state:**
   ```bash
   npm test
   ```

---

## Dependencies

### Files to Modify
1. `/Users/noritakasawada/AI_P/one-day-os/src/constants/index.ts`
2. `/Users/noritakasawada/AI_P/one-day-os/src/notifications/NotificationScheduler.ts`

### Files to Read (for context)
- None (all necessary context gathered)

### External Dependencies
- None (no new packages required)

---

## Verification Checklist

- [ ] src/constants/index.ts exports FIVE_QUESTIONS with 6 Japanese questions
- [ ] src/notifications/NotificationScheduler.ts removes local FIVE_QUESTIONS definition
- [ ] NotificationScheduler imports FIVE_QUESTIONS and NOTIFICATION_SCHEDULE from @/constants
- [ ] scheduleDailyNotifications() uses NOTIFICATION_SCHEDULE.TIMES
- [ ] scheduleDailyNotifications() maps FIVE_QUESTIONS to notifications
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Commit message follows convention: "feat(i18n): Phase 0.1 - Unify and translate FIVE_QUESTIONS"

---

## Estimated Impact

### Lines Changed
- **src/constants/index.ts:** ~7 lines modified (lines 35-41)
- **src/notifications/NotificationScheduler.ts:** ~20 lines modified (remove 7, add imports, modify loop)

### Total LOC Delta:** ~+5 lines (net)

### Breaking Changes
- **None:** All changes are internal refactoring
- Notification times will change from (11:00, 13:30, 15:15, 17:00, 19:30) to (6:00, 9:00, 12:00, 15:00, 18:00, 21:00)
- Questions will change to the new Japanese set

---

## Post-Implementation Tasks

1. Run full test suite: `npm test`
2. Verify TypeScript compilation: `npm run tsc`
3. Test notification scheduling manually on device
4. Update CLAUDE.md if notification schedule description needs updating
5. Commit with message: `feat(i18n): Phase 0.1 - Unify and translate FIVE_QUESTIONS`

---

## Notes

### Design Decision: Keep "FIVE_QUESTIONS" Name
Despite having 6 questions, keeping the name `FIVE_QUESTIONS` maintains consistency with existing codebase references and documentation. This avoids cascading renames across multiple files.

### Japanese Translation Choices
- "あなたは誰か？" = "Who are you?" (identity question)
- "あなたは何をしているか？" = "What are you doing?" (action question)
- "なぜそれをしているのか？" = "Why are you doing this?" (purpose question)
- "それはあなたのアイデンティティと一致しているか？" = "Is this aligned with your identity?" (alignment question)
- "次に何をするか？" = "What will you do next?" (intention question)
- "何を避けようとしているか？" = "What are you trying to avoid?" (avoidance question)

These translations maintain the brutalist, direct tone of the original questions while being culturally appropriate for Japanese users.
