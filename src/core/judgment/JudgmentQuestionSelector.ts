/**
 * One Day OS - JudgmentQuestionSelector
 * Selects and renders judgment questions with dynamic variable substitution
 */

import i18n from 'i18next';
import { getDB } from '../../database/client';
import { JUDGMENT_CONSTANTS, DB_TABLES } from '../../constants';
import type { JudgmentCategory } from '../../constants';

/** Question selection result */
export interface SelectedQuestion {
  questionKey: string;      // i18n key (e.g. 'judgment.evasion.q1')
  questionRendered: string; // Final text with variables replaced
  category: JudgmentCategory;
}

/** Category to i18n key prefix mapping */
const CATEGORY_KEY_MAP: Record<JudgmentCategory, string> = {
  EVASION: 'evasion',
  OBSERVER: 'observer',
  DISSONANCE: 'dissonance',
  ANTI_VISION: 'anti_vision',
  SURVIVAL: 'survival',
};

/** Number of questions per category */
const QUESTIONS_PER_CATEGORY = 2;

export class JudgmentQuestionSelector {
  /**
   * Select a random question for the given category and render with user data
   */
  static async selectQuestion(category: JudgmentCategory): Promise<SelectedQuestion> {
    const categoryKey = CATEGORY_KEY_MAP[category];
    const questionIndex = Math.floor(Math.random() * QUESTIONS_PER_CATEGORY) + 1;
    const questionKey = `judgment.${categoryKey}.q${questionIndex}`;

    // Get the raw template
    const rawTemplate = i18n.t(questionKey);

    // Render with dynamic variables
    const rendered = await JudgmentQuestionSelector.renderTemplate(rawTemplate);

    return {
      questionKey,
      questionRendered: rendered,
      category,
    };
  }

  /**
   * Render a question template by replacing {{}} variables with user data
   */
  private static async renderTemplate(template: string): Promise<string> {
    let result = template;

    // Only fetch data if template contains variables
    if (!template.includes('{{')) {
      return result;
    }

    try {
      const db = getDB();

      // Replace {{quest_1}} with first quest text
      if (result.includes('{{quest_1}}')) {
        const quest = await db.getFirstAsync<{ quest_text: string }>(
          `SELECT quest_text FROM ${DB_TABLES.QUESTS} ORDER BY id ASC LIMIT 1`
        );
        result = result.replace(/\{\{quest_1\}\}/g, quest?.quest_text || '???');
      }

      // Replace {{identity}} with identity statement
      if (result.includes('{{identity}}')) {
        const identity = await db.getFirstAsync<{ identity_statement: string }>(
          `SELECT identity_statement FROM ${DB_TABLES.IDENTITY} WHERE id = 1`
        );
        result = result.replace(/\{\{identity\}\}/g, identity?.identity_statement || '???');
      }

      // Replace {{anti_vision_fragment}} with extracted fragment
      if (result.includes('{{anti_vision_fragment}}')) {
        const antiVision = await db.getFirstAsync<{ anti_vision: string }>(
          `SELECT anti_vision FROM ${DB_TABLES.IDENTITY} WHERE id = 1`
        );
        const fragment = JudgmentQuestionSelector.extractFragment(antiVision?.anti_vision || '');
        result = result.replace(/\{\{anti_vision_fragment\}\}/g, fragment || '???');
      }
    } catch (error) {
      console.error('Failed to render judgment template:', error);
      // Return template with unresolved variables replaced by ???
      result = result.replace(/\{\{[^}]+\}\}/g, '???');
    }

    return result;
  }

  /**
   * Extract a random fragment from anti-vision text
   * Splits on punctuation (。、！？\n) and picks one randomly
   * If text is short (≤ threshold), returns full text
   */
  static extractFragment(antiVision: string): string {
    if (!antiVision || antiVision.trim().length === 0) {
      return '???';
    }

    if (antiVision.length <= JUDGMENT_CONSTANTS.ANTI_VISION_FRAGMENT_MIN_LENGTH) {
      return antiVision;
    }

    const fragments = antiVision
      .split(/[。、！？\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (fragments.length === 0) {
      return antiVision;
    }

    return fragments[Math.floor(Math.random() * fragments.length)];
  }
}
