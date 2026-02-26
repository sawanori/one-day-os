
/**
 * JudgmentBackgroundHandler
 *
 * DEPRECATED: The summons model no longer uses OS notification action buttons.
 * Background YES/NO processing has been removed.
 *
 * This file is kept as a no-op to avoid breaking imports during transition.
 * It can be safely deleted once all references are removed.
 */

/**
 * No-op. Background notification handling is no longer needed
 * under the summons model (tap-to-open only, no YES/NO buttons).
 */
export async function registerJudgmentBackgroundHandler(): Promise<void> {
  // Intentionally empty — summons model does not use background task processing
}
