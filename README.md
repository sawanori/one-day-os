# One Day OS

**Core Concept:** "You don't need years to rebuild your life. All you need is one serious day."

A React Native app built with Expo that helps users rebuild their lives through identity-driven accountability.

## Project Status

Project setup completed. Ready for TDD implementation.

## Tech Stack

- **Platform:** React Native with Expo SDK 54
- **Language:** TypeScript (strict mode)
- **Database:** SQLite (expo-sqlite)
- **Navigation:** Expo Router v4
- **Testing:** Jest + React Native Testing Library
- **Design:** Brutalist UI

## Project Structure

```
one-day-os/
├── app/                    # Expo Router app directory
│   ├── (tabs)/            # Tab navigation
│   ├── onboarding/        # Onboarding flow
│   └── _layout.tsx        # Root layout
├── src/
│   ├── core/              # Core business logic
│   │   ├── identity/      # Identity & IH management
│   │   ├── daily/         # Daily cycle management
│   │   ├── phase/         # Time-based phase control
│   │   └── despair/       # Despair mode (wipe) logic
│   ├── database/          # SQLite database
│   ├── notifications/     # Notification system
│   ├── ui/                # UI components & themes
│   ├── types/             # TypeScript type definitions
│   └── constants/         # App constants
└── __tests__/             # E2E tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test
```

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

## Core Features (Planned)

### Identity Health (IH) System
- Starts at 100%
- Penalties:
  - -20% for missing any notification (5 min timeout)
  - -20% if any quest incomplete at day end
- IH reaches 0% → Complete data wipe (Despair Mode)

### Notification System
- 6 notifications per day (6:00, 9:00, 12:00, 15:00, 18:00, 21:00)
- 5-minute response window
- "Five Questions" reflection prompts

### Three-Layer System
1. **Core Identity Layer** - Anti-vision, Identity, Mission
2. **Morning Layer** - Today's quests
3. **Evening Layer** - Quest completion & reflection

### Phase System
Time-based UI restrictions:
- Morning (6:00-12:00)
- Afternoon (12:00-18:00)
- Evening (18:00-24:00)
- Night (0:00-6:00)

## Development Approach

This project follows **Test-Driven Development (TDD)**:
1. Write tests first
2. Implement minimum code to pass
3. Refactor

## Key Specifications

- **No backup allowed** - Data loss is permanent
- **No grace periods** - Rules are absolute
- **Daily reset** - Quests reset at midnight, IH persists
- **Brutalist design** - Raw, functional, no sugar-coating

## Documentation

- [Implementation Plan v1.1](/home/noritakasawada/project/20260128/docs/implementation-plan-v1.1.md)

## License

Private project - All rights reserved
