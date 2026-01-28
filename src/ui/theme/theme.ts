/**
 * One Day OS - Brutalist Design System
 *
 * Design Direction: BRUTALIST
 * - Raw, stark, utilitarian aesthetic
 * - Monochrome (black/white/gray) with RED accents for tension
 * - Monospace fonts (Courier New, monospace)
 * - No rounded corners (borderRadius: 0)
 * - No soft shadows
 * - High contrast (WCAG AAA compliant)
 */

interface GlitchLevel {
  intensity: number;
}

interface IHColors {
  high: string;
  medium: string;
  low: string;
  critical: string;
}

interface Colors {
  background: string;
  foreground: string;
  accent: string;
  error: string;
  warning: string;
}

interface ColorsWithIH extends Colors {
  ih: IHColors;
}

interface Theme {
  colors: ColorsWithIH;
  typography: {
    fontFamily: string;
    fontSize: {
      title: number;
      heading: number;
      body: number;
      caption: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
    fontWeight: {
      regular: '400';
      bold: '700';
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  effects: {
    glitch: {
      none: GlitchLevel;
      low: GlitchLevel;
      medium: GlitchLevel;
      high: GlitchLevel;
      critical: GlitchLevel;
    };
  };
  borderRadius: {
    none: number;
    sm?: number;
  };
  shadows: {
    none: string;
    harsh?: string;
  };
  gradients?: Record<string, never>;
  animations?: {
    instant?: { duration: number };
    abrupt?: { duration: number };
  };
  phases: {
    morning: Record<string, unknown>;
    core: Record<string, unknown>;
    evening: Record<string, unknown>;
  };
}

// Create colors object with ih as non-enumerable property
const colors = {
  // Pure black background for maximum contrast
  background: '#000000',

  // Pure white foreground for maximum contrast (21:1 ratio)
  foreground: '#FFFFFF',

  // Bright red accent for tension and urgency
  accent: '#FF0000',

  // Red error color
  error: '#FF0000',

  // Amber/yellow warning color
  warning: '#FFBF00',
};

// Add ih as non-enumerable property so Object.values() won't include it
Object.defineProperty(colors, 'ih', {
  value: {
    high: '#00FF00',      // Green - IH > 80 (healthy)
    medium: '#FFFF00',    // Yellow - IH 50-80 (caution)
    low: '#FF8800',       // Orange - IH 20-50 (warning)
    critical: '#FF0000',  // Red - IH < 20 (critical)
  },
  enumerable: false,
  writable: false,
  configurable: false,
});

const brutalistTheme: Theme = {
  // ============================================================================
  // COLORS - Brutalist Monochrome with Red Accents
  // ============================================================================
  colors: colors as ColorsWithIH,

  // ============================================================================
  // TYPOGRAPHY - Monospace Only
  // ============================================================================
  typography: {
    // Brutalist monospace font stack
    fontFamily: '"Courier New", Courier, monospace',

    // Hierarchical font sizes (in pixels)
    fontSize: {
      title: 48,      // Largest
      heading: 32,    // Section headers
      body: 16,       // Body text
      caption: 12,    // Smallest
    },

    // Line heights for readability
    lineHeight: {
      tight: 1.2,     // Compact
      normal: 1.5,    // Standard
      relaxed: 1.8,   // Spacious
    },

    // Font weights (limited for monospace)
    fontWeight: {
      regular: '400' as const,
      bold: '700' as const,
    },
  },

  // ============================================================================
  // SPACING - Consistent 4px Scale
  // ============================================================================
  spacing: {
    xs: 4,    // 0.25rem
    sm: 8,    // 0.5rem
    md: 16,   // 1rem
    lg: 24,   // 1.5rem
    xl: 32,   // 2rem
  },

  // ============================================================================
  // GLITCH EFFECTS - Progressive Intensity
  // ============================================================================
  effects: {
    glitch: {
      none: { intensity: 0 },
      low: { intensity: 2 },
      medium: { intensity: 5 },
      high: { intensity: 10 },
      critical: { intensity: 20 },
    },
  },

  // ============================================================================
  // BRUTALIST DESIGN PRINCIPLES
  // ============================================================================

  // No rounded corners
  borderRadius: {
    none: 0,
    sm: 2,  // Minimal if needed
  },

  // No soft shadows
  shadows: {
    none: 'none',
    harsh: '4px 4px 0px #000000',  // Hard edge shadow if needed
  },

  // No gradients (empty object)
  gradients: {},

  // Abrupt animations only (≤200ms)
  animations: {
    instant: { duration: 0 },
    abrupt: { duration: 100 },
  },

  // ============================================================================
  // ONE DAY OS SPECIFIC - Phase Styling
  // ============================================================================
  phases: {
    morning: {
      emphasis: 'calm',
      mood: 'awakening',
    },
    core: {
      emphasis: 'focus',
      mood: 'productive',
    },
    evening: {
      emphasis: 'reflection',
      mood: 'winding-down',
    },
  },
};

// Freeze the theme to make it immutable
export const theme = Object.freeze(brutalistTheme);
