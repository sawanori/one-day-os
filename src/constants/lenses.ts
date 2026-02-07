/**
 * Lens System Constants
 * Defines lens values, snap thresholds, and configuration for the zoom system
 */

export const LENS_VALUES = {
  MISSION: 0.5,
  IDENTITY: 1.0,
  QUEST: 2.0,
} as const;

export const SNAP_THRESHOLDS = {
  ZOOM_OUT: 0.75,  // Below this, snap to Mission (0.5x)
  ZOOM_IN: 1.5,    // Above this, snap to Quest (2.0x)
} as const;

export const LENS_CONFIG = {
  [LENS_VALUES.MISSION]: {
    label: '0.5x',
    name: 'MISSION',
    description: '1 YEAR PLAN',
  },
  [LENS_VALUES.IDENTITY]: {
    label: '1.0x',
    name: 'IDENTITY',
    description: 'WHO YOU ARE',
  },
  [LENS_VALUES.QUEST]: {
    label: '2.0x',
    name: 'QUEST',
    description: 'TODAY',
  },
} as const;

export const LENS_ANIMATION_CONFIG = {
  friction: 6,  // Lower friction = more bouncy/dramatic
  tension: 50,  // Higher tension = faster initial movement
} as const;

export type LensValue = typeof LENS_VALUES[keyof typeof LENS_VALUES];
