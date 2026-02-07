import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
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
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = getDB();

        // Check if identity table exists and has data
        const identityData = await db.getFirstAsync<any>('SELECT * FROM identity WHERE id = 1');

        // If no identity data, redirect to onboarding
        if (!identityData || !identityData.identity_statement) {
          router.replace('/onboarding');
          return;
        }

        const questsData = await db.getAllAsync<Quest>('SELECT * FROM quests WHERE DATE(created_at) = DATE("now")');

        setMission(identityData.one_year_mission || '');
        setAntiVision(identityData.anti_vision || '');
        setIdentity(identityData.identity_statement || '');
        setQuests(questsData || []);
        setIsLoading(false);
      } catch (error) {
        // Database not initialized yet or no data exists - go to onboarding
        router.replace('/onboarding');
      }
    };
    loadData();
  }, [router]);

  // Toggle quest completion
  const toggleQuest = async (id: number) => {
    try {
      const db = getDB();
      const quest = quests.find(q => q.id === id);
      if (!quest) return;

      const newCompleted = quest.is_completed === 0 ? 1 : 0;
      await db.runAsync(
        'UPDATE quests SET is_completed = ?, completed_at = ? WHERE id = ?',
        [newCompleted, newCompleted === 1 ? new Date().toISOString() : null, id]
      );

      // Update local state
      setQuests(prev => prev.map(q => q.id === id ? { ...q, is_completed: newCompleted } : q));

      // Restore health on completion
      if (newCompleted === 1) {
        const engine = await IdentityEngine.getInstance();
        await engine.restoreHealth(5);
      }
    } catch (error) {
      console.error('Failed to toggle quest:', error);
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
