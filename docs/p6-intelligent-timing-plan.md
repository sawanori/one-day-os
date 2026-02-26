# P6: Intelligent Timing (Evasion Detection + Adaptation)

## Implementation Plan

### 1. New Module: `src/core/judgment/JudgmentTimingEngine.ts`

**Purpose:** Encapsulate all timing adjustment and intelligent category selection logic.

**Exports:**
- `JudgmentTimingEngine` class (static methods)
- `JudgmentContext` interface
- `TimingAdjustment` interface

**Methods:**
- `evaluateOnResume(engine, lastBackgroundTime)` -> `TimingAdjustment`
  - Checks 4 detection patterns and returns adjustment instructions
- `selectCategory(context)` -> `JudgmentCategory`
  - Context-aware category selection per spec
- `applyTimingAdjustment(engine, adjustment)` -> void
  - Reschedules unfired judgments based on adjustment

**Detection Patterns:**
1. Long inactivity (2h+) -> fire immediately
2. Quests incomplete + after 16:00 -> concentrate remaining in 16:00-22:00
3. Previous response NO/TIMEOUT -> next within 30 min
4. All YES consecutive -> maintain minimum interval (no change)

### 2. JudgmentEngine Additions

**New methods:**
- `getLastResponse(date)` - Query judgment_log for most recent response today
- `rescheduleJudgment(scheduleId, newTime)` - Update scheduled_time for unfired entry
- `getUnfiredJudgments(date, currentTime)` - Get unfired future judgments

### 3. `_layout.tsx` AppState Handler Enhancement

Track `lastBackgroundTime` via useRef. On `active`:
1. Run existing overdue logic
2. Call `JudgmentTimingEngine.evaluateOnResume()`
3. Apply timing adjustments
4. Re-schedule OS notifications

### 4. `JudgmentInvasionOverlay.tsx` Enhancement

When firing a judgment, override the pre-assigned category:
1. Build JudgmentContext (quest status, last response, IH, hour)
2. Call `JudgmentTimingEngine.selectCategory(context)`
3. Use returned category instead of schedule.category

### 5. Last Foreground Time Tracking

Use `useRef<number | null>` in `_layout.tsx` to store the timestamp when app went to background.
No DB persistence needed - only detecting gaps within a single session lifecycle.

### Test Plan

- Unit tests for `selectCategory()` - all 6 paths
- Unit tests for `evaluateOnResume()` - 4 detection patterns
- Unit tests for `applyTimingAdjustment()` - rescheduling logic
- Integration: existing 673 tests must continue to pass
