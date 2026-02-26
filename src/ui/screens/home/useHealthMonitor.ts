import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';
import { HapticEngine } from '../../../core/HapticEngine';

type LensValue = 0.5 | 1.0 | 2.0;

/**
 * useHealthMonitor
 * Polls Identity Health every 2 seconds and provides heartbeat haptics
 * when the Identity lens (1.0x) is active.
 * Navigates to /death when isDead is detected.
 */
export const useHealthMonitor = (lens: LensValue) => {
  const [health, setHealth] = useState(100);
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  // Check health periodically (centralized)
  useEffect(() => {
    const checkHealth = async () => {
      const engine = await IdentityEngine.getInstance();
      const status = await engine.checkHealth();
      setHealth(status.health);

      // Navigate to death screen when IH reaches 0 (any path)
      if (status.isDead && !isNavigatingRef.current) {
        isNavigatingRef.current = true;
        router.replace('/death');
      }
    };
    checkHealth();

    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Identity Lens Heartbeat Haptics (1.0x only)
  useEffect(() => {
    if (lens !== 1.0) return;

    // Start heartbeat loop
    const heartbeatInterval = setInterval(() => {
      HapticEngine.pulseHeartbeat();
    }, 1000); // Every 1 second

    return () => clearInterval(heartbeatInterval);
  }, [lens]);

  return { health, setHealth };
};
