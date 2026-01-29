# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Orchestration Rules (MANDATORY)

**You are a Manager and Agent Orchestrator. You MUST NOT implement anything directly.**

### Core Principles

1. **Delegation Only**: All implementation work must be delegated to subagents or Task agents. Never write code directly.

2. **Task Micro-decomposition**: Break down all tasks into extremely fine-grained subtasks. Build PDCA (Plan-Do-Check-Act) cycles for each.

3. **Strict Compliance**: These rules must be followed regardless of how instructions are given.

### Model Assignment

| Role | Model | Responsibilities |
|------|-------|------------------|
| **Planning & Review** | Opus | High-level planning, implementation plan review, architecture decisions |
| **Implementation** | Sonnet | Creating implementation plans, writing actual code, executing tasks |

**Switch between models as appropriate for each phase of work.**

### Workflow Pattern

```
[User Request]
     ↓
[Opus: Planning & Task Decomposition]
     ↓
[Sonnet: Implementation Plan Creation]
     ↓
[Opus: Implementation Plan Review]
     ↓
[Sonnet: Implementation Execution]
     ↓
[Opus: Result Verification]
     ↓
[PDCA Cycle Continues...]
```

## Implementation Plan Requirements (MANDATORY)

**Never implement without completing this flow:**

### Pre-Implementation Flow

```
1. Create Implementation Plan
   └── Save to /docs directory
          ↓
2. Plan Review (Opus)
   └── Thoroughly check for:
       - Omissions and gaps
       - Potential error sources
       - Areas that could cause issues in future implementation
          ↓
3. Issue Resolution
   └── List all identified issues
   └── Fix each issue
   └── Report completion
          ↓
4. Implementation (Sonnet)
   └── Only after review is complete
```

### Review Checklist

- [ ] No missing requirements or specifications
- [ ] No logical gaps in the plan
- [ ] No potential error hotspots identified
- [ ] All edge cases considered
- [ ] Dependencies clearly defined
- [ ] Rollback strategy included (if applicable)

## Tool Usage Rules

### Frontend Design Skill (MANDATORY)

**All frontend implementation MUST use the `frontend-design` skill.**

Location: `.claude/skills/frontend-design.md`

Requirements:
- Avoid generic AI aesthetics (Inter, Roboto, purple gradients, cookie-cutter layouts)
- Choose bold, distinctive aesthetic direction (brutalist, minimalist, retro-futuristic, etc.)
- Prioritize unique typography, cohesive color schemes, thoughtful motion
- Production-grade, visually striking, memorable interfaces

### Serena MCP Priority

**When token reduction is possible, MUST use Serena MCP tools.**

Prefer Serena MCP tools for:
- Symbol-based code navigation (`find_symbol`, `get_symbols_overview`)
- Targeted code reading (`read_file` with line ranges)
- Pattern-based search (`search_for_pattern`)
- Symbol-level editing (`replace_symbol_body`, `insert_after_symbol`)

## Available Agents

Agent definitions are located in `.claude/agents/`. Use these specialized agents for their designated purposes.

---

## Project: One Day OS

**Identity-driven life accountability system built with React Native + Expo**

### Core Philosophy

"You don't need years to rebuild your life. All you need is one serious day."

This is a **life-force accountability system** that tracks Identity Health (IH) - a metric that degrades through missed notifications and incomplete quests. When IH reaches 0%, all data is permanently wiped (no recovery possible).

### Technology Stack

- **Platform:** React Native 0.81.5 + Expo SDK 54
- **Language:** TypeScript (strict mode)
- **Database:** SQLite (expo-sqlite ~15.0.0) - Local-first, serverless
- **Navigation:** Expo Router v4 (file-based routing)
- **Testing:** Jest + React Native Testing Library
- **Design System:** Brutalist (see src/ui/theme/theme.ts)

### Development Commands

```bash
# Development
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios           # Run on iOS

# Testing
npm test              # Run all Jest tests

# Module alias: @/* resolves to ./src/*
# Example: import { IdentityEngine } from '@/core/identity/IdentityEngine'
```

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

### Architecture Overview

#### Three-Layer System

1. **Core Identity Layer** (app/(tabs)/index.tsx)
   - Displays Anti-vision, Identity Statement, 1-Year Mission
   - Always accessible, read-only after onboarding

2. **Morning Layer** (app/(tabs)/morning.tsx)
   - Accessible 6:00-12:00 only
   - Displays today's quests (read-only)

3. **Evening Layer** (app/(tabs)/evening.tsx)
   - Accessible 18:00-24:00 only
   - Quest completion + Five Questions reflection

#### Core Engine: IdentityEngine (Singleton)

Location: `src/core/identity/IdentityEngine.ts`

The singleton that manages all Identity Health calculations and state. Key methods:
- `getInstance()` - Get singleton instance
- `calculateIH()` - Compute current IH based on DB state
- `applyPenalty(type)` - Apply penalty and trigger wipe if IH ≤ 0

**Critical Constants** (src/constants/index.ts):
```typescript
INITIAL_IH: 100                    // Starts at 100%
NOTIFICATION_PENALTY: 15           // -15% for NO/IGNORED
MISSED_NOTIFICATION_PENALTY: 20    // -20% for timeout
INCOMPLETE_QUEST_PENALTY: 20       // -20% if ANY quest incomplete at day end
WIPE_THRESHOLD: 0                  // Complete data wipe at 0%
NOTIFICATION_TIMEOUT_MINUTES: 5    // 5-minute response window
```

#### Notification System

Location: `src/notifications/`

**6 Daily Notifications:** 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
- Each notification has a **5-minute response window**
- User must respond YES or NO (via NotificationHandler)
- Missing response = -20% IH penalty
- Responding NO/IGNORED = -15% IH penalty

**Five Reflection Questions** (constants):
1. "Who are you?"
2. "What are you doing?"
3. "Why are you doing this?"
4. "Is this aligned with your identity?"
5. "What will you do next?"

#### Database Schema

Location: `src/database/schema.ts`

**Four Core Tables:**

1. **identity** (single-row, id=1)
   - `identity_health` (0-100)
   - `anti_vision`, `identity_statement`, `one_year_mission`
   - `created_at`, `updated_at`

2. **quests** (daily tasks)
   - `quest_text`, `is_completed`
   - `created_at`, `completed_at`

3. **notifications** (6 per day)
   - `scheduled_time`, `responded_at`, `timeout_at`
   - `is_missed` (boolean)

4. **daily_state** (single-row, id=1)
   - `current_date`, `last_reset_at`

#### Key Managers

| Manager | Location | Purpose |
|---------|----------|---------|
| **IdentityEngine** | src/core/identity/ | IH calculation, penalty application, wipe triggering |
| **WipeManager** | src/core/identity/ | Complete data deletion when IH = 0 |
| **DespairModeManager** | src/core/despair/ | Post-wipe state management (allows immediate re-onboarding) |
| **NotificationScheduler** | src/notifications/ | Schedule 6 daily notifications |
| **NotificationHandler** | src/notifications/ | Handle YES/NO responses, apply penalties |

#### Brutalist Design System

Location: `src/ui/theme/theme.ts`

**Core Principles:**
- **Pure black (#000000) background, white (#FFFFFF) foreground**
- **Red (#FF0000) accents** for tension/urgency
- **Monospace only:** Courier New
- **No rounded corners, gradients, or soft shadows**
- **No animations** (animation: 'none')
- **IH-based color coding:**
  - IH > 80%: Green
  - IH 50-80%: Yellow
  - IH 20-50%: Orange
  - IH < 20%: Red

**GlitchText Component** (src/ui/components/GlitchText.tsx):
- Visual glitch effect intensity tied to IH degradation
- Lower IH = higher glitch intensity

### Testing Strategy

**Test-Driven Development (TDD)** - Write tests first, then implement.

**Test File Locations:**
- Colocated: `*.test.ts(x)` next to implementation files
- E2E tests: `__tests__/` directory

**Run Single Test:**
```bash
npm test -- <test-file-path>
# Example: npm test -- src/core/identity/IdentityEngine.test.ts
```

**Key Test Coverage:**
- Identity Engine: IH calculations, penalty logic, wipe triggering
- Notification System: Scheduling, timeout detection, response handling
- Database: Schema initialization, INSERT OR IGNORE for IH initialization
- UI Components: GlitchText, phase restrictions

### Critical Implementation Notes

#### No Backup/Recovery Allowed
- **Android:** `allowBackup: false` in app.json
- **iOS:** Configured to disable iCloud backup
- Data loss is **permanent and intentional** - core feature, not bug

#### Phase System (Time-Based UI Restrictions)
Location: `src/types/phase.ts`

- **MORNING** (6:00-12:00): Can view quests (read-only)
- **AFTERNOON** (12:00-18:00): No special access
- **EVENING** (18:00-24:00): Can complete quests + reflect
- **NIGHT** (0:00-6:00): No special access

**PhaseGuard Component** (src/ui/components/PhaseGuard.tsx):
Wraps screens to enforce time-based access restrictions.

#### Daily Reset Logic
- **IH persists** across days (never resets)
- **Quests reset** at midnight (all marked incomplete)
- **Notifications reschedule** for next day
- Incomplete quests at day end = -20% IH penalty (applied ONCE, not per quest)

#### Onboarding Flow
Location: `app/onboarding/`

1. Welcome screen
2. Anti-vision input
3. Identity statement input
4. 1-Year mission input
5. Today's quests input (3-5 quests)

**First-time users only** - no access to main app until onboarding complete.

### File Naming Conventions

- **Screens:** PascalCase (e.g., OnboardingFlow.tsx)
- **Components:** PascalCase (e.g., GlitchText.tsx)
- **Managers/Engines:** PascalCase (e.g., IdentityEngine.ts)
- **Types:** lowercase (e.g., identity.ts, notification.ts)
- **Tests:** Match implementation file with .test suffix

### Important Constraints

#### Design Constraints
- **No gamification** - This is not a game
- **No encouraging messages** - Brutalist honesty only
- **No progress charts/graphs** - Only current IH value
- **No history logs** - Focus on present only

#### Behavioral Constraints
- **No grace periods** - All penalties are immediate
- **No partial credit** - Quest is complete or incomplete
- **No recovery mechanism** - Wipe is final
- **No backup prompts** - No warnings before data loss

### Documentation References

- **Implementation Plan:** docs/implementation-plan-v1.1.md (81KB, Japanese)
- **Original Concept:** docs/idea.md (Japanese)
- **Review Notes:** docs/implementation-plan-v1.1-review.md
