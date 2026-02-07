import { useState, useEffect } from 'react';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';
import { HapticEngine } from '../../../core/HapticEngine';

type LensValue = 0.5 | 1.0 | 2.0;

/**
 * useHealthMonitor
 * Polls Identity Health every 2 seconds and provides heartbeat haptics
 * when the Identity lens (1.0x) is active.
 */
export const useHealthMonitor = (lens: LensValue) => {
  const [health, setHealth] = useState(100);

  // Check health periodically (centralized)
  useEffect(() => {
    const checkHealth = async () => {
      const engine = await IdentityEngine.getInstance();
      const status = await engine.checkHealth();
      setHealth(status.health);
    };
    checkHealth();

    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
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
