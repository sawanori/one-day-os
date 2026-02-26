/**
 * One Day OS - OnboardingValidator
 * Validates step data for the unified onboarding flow
 */

import { OnboardingStep, StepData } from './types';

/**
 * OnboardingValidator - Static class for validating onboarding step data
 */
export class OnboardingValidator {
  /**
   * Validate step data based on step type
   */
  public static validate(step: OnboardingStep, data: StepData): void {
    switch (step) {
      case 'covenant':
      case 'optical_calibration':
      case 'first_judgment':
        // Ceremony steps require no data
        if (data !== null) {
          throw new Error(`${step} step does not require data`);
        }
        break;

      case 'excavation':
        if (!data || typeof data !== 'object' || !('antiVision' in data)) {
          throw new Error('Excavation step requires antiVision data');
        }
        const antiVisionData = data as { antiVision: string };
        if (!antiVisionData.antiVision || antiVisionData.antiVision.trim() === '') {
          throw new Error('Anti-vision cannot be empty');
        }
        break;

      case 'identity':
        if (!data || typeof data !== 'object' || !('identity' in data)) {
          throw new Error('Identity step requires identity data');
        }
        const identityData = data as { identity: string };
        if (!identityData.identity || identityData.identity.trim() === '') {
          throw new Error('Identity cannot be empty');
        }
        break;

      case 'mission':
        if (!data || typeof data !== 'object' || !('mission' in data)) {
          throw new Error('Mission step requires mission data');
        }
        const missionData = data as { mission: string };
        if (!missionData.mission || missionData.mission.trim() === '') {
          throw new Error('Mission cannot be empty');
        }
        break;

      case 'quests':
        if (!data || typeof data !== 'object' || !('quests' in data)) {
          throw new Error('Quests step requires quests data');
        }
        const questsData = data as { quests: [string, string] };
        if (!Array.isArray(questsData.quests)) {
          throw new Error('Quests must be an array');
        }
        if (questsData.quests.length !== 2) {
          throw new Error('Quests must contain exactly 2 items');
        }
        if (!questsData.quests[0] || questsData.quests[0].trim() === '' ||
            !questsData.quests[1] || questsData.quests[1].trim() === '') {
          throw new Error('Quest items cannot be empty');
        }
        break;

      case 'complete':
        throw new Error('Cannot manually complete the complete step');

      default:
        throw new Error(`Unknown step: ${step}`);
    }
  }
}
