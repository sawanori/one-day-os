/**
 * One Day OS - OnboardingValidator Tests
 * Unit tests for validation logic extracted from OnboardingManager
 */

import { OnboardingValidator } from './OnboardingValidator';

describe('OnboardingValidator', () => {
  describe('welcome step', () => {
    test('accepts null data', () => {
      expect(() => OnboardingValidator.validate('welcome', null)).not.toThrow();
    });

    test('rejects non-null data', () => {
      expect(() =>
        OnboardingValidator.validate('welcome', { antiVision: 'test' })
      ).toThrow('Welcome step does not require data');
    });
  });

  describe('anti-vision step', () => {
    test('accepts valid anti-vision data', () => {
      expect(() =>
        OnboardingValidator.validate('anti-vision', { antiVision: 'Living a meaningless Tuesday' })
      ).not.toThrow();
    });

    test('rejects null data', () => {
      expect(() => OnboardingValidator.validate('anti-vision', null)).toThrow(
        'Anti-vision step requires antiVision data'
      );
    });

    test('rejects missing antiVision field', () => {
      expect(() =>
        OnboardingValidator.validate('anti-vision', { identity: 'wrong field' } as any)
      ).toThrow('Anti-vision step requires antiVision data');
    });

    test('rejects empty string', () => {
      expect(() =>
        OnboardingValidator.validate('anti-vision', { antiVision: '' })
      ).toThrow('Anti-vision cannot be empty');
    });

    test('rejects whitespace-only string', () => {
      expect(() =>
        OnboardingValidator.validate('anti-vision', { antiVision: '   ' })
      ).toThrow('Anti-vision cannot be empty');
    });

    test('rejects null value for antiVision field', () => {
      expect(() =>
        OnboardingValidator.validate('anti-vision', { antiVision: null as any })
      ).toThrow('Anti-vision cannot be empty');
    });
  });

  describe('identity step', () => {
    test('accepts valid identity data', () => {
      expect(() =>
        OnboardingValidator.validate('identity', { identity: 'I am a person who takes action' })
      ).not.toThrow();
    });

    test('rejects null data', () => {
      expect(() => OnboardingValidator.validate('identity', null)).toThrow(
        'Identity step requires identity data'
      );
    });

    test('rejects missing identity field', () => {
      expect(() =>
        OnboardingValidator.validate('identity', { antiVision: 'wrong field' } as any)
      ).toThrow('Identity step requires identity data');
    });

    test('rejects empty string', () => {
      expect(() =>
        OnboardingValidator.validate('identity', { identity: '' })
      ).toThrow('Identity cannot be empty');
    });

    test('rejects whitespace-only string', () => {
      expect(() =>
        OnboardingValidator.validate('identity', { identity: '   ' })
      ).toThrow('Identity cannot be empty');
    });

    test('rejects null value for identity field', () => {
      expect(() =>
        OnboardingValidator.validate('identity', { identity: null as any })
      ).toThrow('Identity cannot be empty');
    });
  });

  describe('mission step', () => {
    test('accepts valid mission data', () => {
      expect(() =>
        OnboardingValidator.validate('mission', { mission: 'Break the pattern of procrastination' })
      ).not.toThrow();
    });

    test('rejects null data', () => {
      expect(() => OnboardingValidator.validate('mission', null)).toThrow(
        'Mission step requires mission data'
      );
    });

    test('rejects missing mission field', () => {
      expect(() =>
        OnboardingValidator.validate('mission', { identity: 'wrong field' } as any)
      ).toThrow('Mission step requires mission data');
    });

    test('rejects empty string', () => {
      expect(() =>
        OnboardingValidator.validate('mission', { mission: '' })
      ).toThrow('Mission cannot be empty');
    });

    test('rejects whitespace-only string', () => {
      expect(() =>
        OnboardingValidator.validate('mission', { mission: '   ' })
      ).toThrow('Mission cannot be empty');
    });

    test('rejects null value for mission field', () => {
      expect(() =>
        OnboardingValidator.validate('mission', { mission: null as any })
      ).toThrow('Mission cannot be empty');
    });
  });

  describe('quests step', () => {
    test('accepts valid quests data with 2 items', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: ['Morning workout', 'Evening meditation'] })
      ).not.toThrow();
    });

    test('rejects null data', () => {
      expect(() => OnboardingValidator.validate('quests', null)).toThrow(
        'Quests step requires quests data'
      );
    });

    test('rejects missing quests field', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { mission: 'wrong field' } as any)
      ).toThrow('Quests step requires quests data');
    });

    test('rejects non-array quests', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: 'not an array' } as any)
      ).toThrow('Quests must be an array');
    });

    test('rejects array with 1 item', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: ['Only one'] } as any)
      ).toThrow('Quests must contain exactly 2 items');
    });

    test('rejects array with 3 items', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: ['One', 'Two', 'Three'] } as any)
      ).toThrow('Quests must contain exactly 2 items');
    });

    test('rejects empty first quest', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: ['', 'Quest 2'] as [string, string] })
      ).toThrow('Quest items cannot be empty');
    });

    test('rejects empty second quest', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: ['Quest 1', ''] as [string, string] })
      ).toThrow('Quest items cannot be empty');
    });

    test('rejects whitespace-only first quest', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: ['   ', 'Quest 2'] as [string, string] })
      ).toThrow('Quest items cannot be empty');
    });

    test('rejects whitespace-only second quest', () => {
      expect(() =>
        OnboardingValidator.validate('quests', { quests: ['Quest 1', '   '] as [string, string] })
      ).toThrow('Quest items cannot be empty');
    });
  });

  describe('complete step', () => {
    test('rejects manual completion of complete step', () => {
      expect(() => OnboardingValidator.validate('complete', null)).toThrow(
        'Cannot manually complete the complete step'
      );
    });
  });

  describe('unknown step', () => {
    test('rejects unknown step name', () => {
      expect(() =>
        OnboardingValidator.validate('unknown-step' as any, null)
      ).toThrow('Unknown step: unknown-step');
    });
  });
});
