import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';
import { getDB } from '../../../database/client';

export interface Quest {
  id: number;
  quest_text: string;
  is_completed: number;
  created_at: string;
  completed_at: string | null;
}

/**
 * useHomeData
 * Loads identity and quest data from the database.
 * Redirects to onboarding if no identity data exists.
 * Provides quest toggle functionality.
 */
export const useHomeData = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Data from database
  const [mission, setMission] = useState('');
  const [antiVision, setAntiVision] = useState('');
  const [identity, setIdentity] = useState('');
  const [quests, setQuests] = useState<Quest[]>([]);

  // Load data from database and check onboarding status
  const loadData = useCallback(async () => {
    try {
      const db = getDB();

      // Check if identity table exists and has data
      const identityData = await db.getFirstAsync<any>('SELECT * FROM identity WHERE id = 1');

      // If no identity data, redirect to onboarding
      if (!identityData || !identityData.identity_statement) {
        router.replace('/onboarding');
        return;
      }

      // DailyManager.resetDailyQuests() deletes stale quests on date change,
      // so no date filter needed here. Avoids UTC/local mismatch with legacy data.
      const questsData = await db.getAllAsync<Quest>(
        'SELECT * FROM quests ORDER BY id ASC'
      );

      setMission(identityData.one_year_mission || '');
      setAntiVision(identityData.anti_vision || '');
      setIdentity(identityData.identity_statement || '');
      setQuests(questsData || []);
      setIsLoading(false);
    } catch (error) {
      // Database not initialized yet or no data exists - go to onboarding
      router.replace('/onboarding');
    }
  }, [router]);

  // Load on first mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload whenever the screen regains focus (e.g. after date change or returning from morning)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Toggle quest completion
  // Internal function that performs the actual DB update
  const executeToggle = async (id: number) => {
    try {
      const db = getDB();
      const quest = quests.find(q => q.id === id);
      if (!quest) return;

      const newCompleted = quest.is_completed === 0 ? 1 : 0;
      const wasAlreadyCompletedBefore = quest.completed_at !== null;

      if (newCompleted === 1) {
        await db.runAsync(
          'UPDATE quests SET is_completed = 1, completed_at = COALESCE(completed_at, ?) WHERE id = ?',
          [new Date().toISOString(), id]
        );
      } else {
        await db.runAsync(
          'UPDATE quests SET is_completed = 0 WHERE id = ?',
          [id]
        );
      }

      setQuests(prev => prev.map(q => q.id === id ? {
        ...q,
        is_completed: newCompleted,
        completed_at: newCompleted === 1 ? (q.completed_at || new Date().toISOString()) : q.completed_at,
      } : q));

      if (newCompleted === 1 && !wasAlreadyCompletedBefore) {
        const engine = await IdentityEngine.getInstance();
        await engine.restoreHealth(5);
      }
    } catch (error) {
      console.error('Failed to toggle quest:', error);
    }
  };

  // Public toggle with confirmation alert when unchecking
  const toggleQuest = async (id: number) => {
    const quest = quests.find(q => q.id === id);
    if (!quest) return;

    if (quest.is_completed === 1) {
      // Unchecking — show confirmation alert
      Alert.alert(
        'QUEST UNCHECK',
        'Are you sure? Unchecking a completed quest cannot restore lost IH.',
        [
          { text: 'CANCEL', style: 'cancel' },
          { text: 'UNCHECK', style: 'destructive', onPress: () => executeToggle(id) },
        ]
      );
    } else {
      await executeToggle(id);
    }
  };

  return {
    isLoading,
    mission,
    antiVision,
    identity,
    quests,
    toggleQuest,
  };
};
