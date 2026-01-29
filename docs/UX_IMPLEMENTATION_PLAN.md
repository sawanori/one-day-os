# One Day OS - UX Implementation Plan (Master Version)

This document outlines the technical specifications for implementing the "missing" UX elements required to complete the One Day OS experience.

## 1. Visual Overhaul: The Glitch & Decay System
**Goal**: Visually represent the degradation of "Identity Health" (IH).

### Technical Strategy
- **Glitch Container**: A wrapper component `StressGlitch.tsx` that wraps the entire app content.
- **Performance Control**:
    - **Scope Limit**: Apply chromatic aberration *only* to Headings and Warning text, not body text, to map performance on lower-end devices.
    - **Optimization**: Use `willChange` hardware acceleration props where possible.

- **Implementation Details**:
    - **Low IH (<30%)**: Apply random `transform: [{ translateX }, { translateY }]` jitters to main container every few seconds.
    - **Critical IH (<10%)**:
        - **Chromatic Aberration**: Render text 3 times (Red, Blue, White) with slight offsets.
        - **Noise Overlay**: A semi-transparent PNG of static noise with fluctuating opacity.
    - **Anti-Vision Bleed**: At low health, fade in the user's "Anti-Vision" text as a watermark behind the active lens.

### Deliverables
- [ ] `src/ui/effects/GlitchText.tsx`: Component for chromatic text (performance optimized).
- [ ] `src/ui/effects/NoiseOverlay.tsx`: Absolute view with static noise image.
- [ ] `src/ui/layout/StressContainer.tsx`: HOC that monitors IH and applies effects.

## 2. Haptic Feedback: Physiological Fear
**Goal**: Make the user feel the consequences physically.

### Technical Strategy
- **Library**: `expo-haptics`
- **Patterns**:
    - **Heartbeat**: A custom pattern using `ImpactFeedbackStyle.Heavy` followed immediately by `Light` (Do-kun...).
    - **Punishment**: Continuous `NotificationFeedbackType.Error` during "No" selection in audits.
    - **Engagement**: Sharp `ImpactFeedbackStyle.Medium` when snapping between Lenses.

### Deliverables
- [ ] `src/core/HapticEngine.ts`: Centralized service for haptic patterns.
    - `pulseHeartbeat()`
    - `punishFailure()`
    - `snapLens()`

## 3. The Death Sequence (Data Wipe)
**Goal**: A traumatizing, irreversible "Game Over" experience.

### Technical Strategy
- **Trigger**: `IdentityEngine` detects IH <= 0.
- **Sequence**:
    1.  **Lockout**: Global Modal `DeathScreen.tsx` appears (cannot be closed).
    2.  **The Sentencing**: Text animation: "Identity Collapsed. Executing Wipe..."
    3.  **The Wipe**:
        - Visual: Progress bar depleting or files "burning" (particle effect or opacity fade).
        - Logic: `DROP TABLE` calls to SQLite.
        - **Safety**: Do NOT drop `user_status`. Only update `is_dead = 1`. This prevents the "Resurrection Bug".
    4.  **The Void**: Screen goes specifically black. "Welcome back to the old you."
    5.  **Resurrection Option**: Small, obscure button for "Identity Insurance" (IAP mock).

### Deliverables
- [ ] `app/death.tsx`: The full-screen modal route.
- [ ] `src/core/WipeAnimation.ts`: Logic to coordinate the visual deletion.

## 4. Seamless Lens Zoom (Gesture Navigation)
**Goal**: Valid "OS" feel using pinch interactions.

### Technical Strategy
- **Dependencies needed**: `react-native-gesture-handler`, `react-native-reanimated`.
- **Configuration**:
    - **Must update `babel.config.js`** to include `react-native-reanimated/plugin`.
    - **Must clear cache**: `npx expo start -c`.
- **Interaction**:
    - **PinchHandler**: Wraps the Lens Container.
    - **Logic**:
        - Detect scale change.
        - `scale < 0.75` -> Snap to **0.5x (Mission)**.
        - `scale > 1.5` -> Snap to **2.0x (Quest)**.
        - `scale ~ 1.0` -> Snap to **1.0x (Identity)**.
    - **Animation**: Smooth interpolation between lens opacities/scales during the gesture.

### Deliverables
- [ ] Install Reanimated & Gesture Handler.
- [ ] Refactor `app/index.tsx` to use `GestureDetector`.
- [ ] `src/ui/lenses/LensContainer.tsx`: Animated view managing the 3 lens states.

## 5. Quick-Action Judgments
**Goal**: Remove friction from the 5 daily questions.

### Technical Strategy
- **Interactive Notifications**: (If supported) Add Actions ("Yes", "No") directly to notification config.
- **Judgment Modal**:
    - A specialized modal `app/judgment.tsx` optimized for speed.
    - **UI**: Huge "YES" / "NO" buttons. No reading required.
    - **Timer**: 5-second countdown to force intuition.

### Deliverables
- [ ] `app/judgment.tsx`: The high-speed interrogation screen.
- [ ] Update `NotificationManager` to deep link to `/judgment?id=...`.

---

## Timeline & Priority
1.  **Haptics & Visuals** (High Impact / Low Cost)
2.  **Death Sequence** (Core Mechanic)
3.  **Lens Zoom** (High Cost / "Wow" Factor) - *Requires dependency installation*
4.  **Judgment Actions** (Optimization)
