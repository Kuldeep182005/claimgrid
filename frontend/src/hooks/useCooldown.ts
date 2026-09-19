import { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../services/sound';

export function useCooldown() {
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [totalMs, setTotalMs] = useState<number>(3000);

  const cooldownEndRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const wasCoolingDownRef = useRef<boolean>(false);

  const startCooldown = useCallback((durationMs: number) => {
    const end = Date.now() + durationMs;
    cooldownEndRef.current = end;
    setTotalMs(durationMs);
    setRemainingMs(durationMs);
    wasCoolingDownRef.current = true;
  }, []);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      if (cooldownEndRef.current > 0) {
        const remaining = Math.max(0, cooldownEndRef.current - Date.now());
        setRemainingMs(remaining);

        if (remaining === 0) {
          cooldownEndRef.current = 0;
          if (wasCoolingDownRef.current) {
            wasCoolingDownRef.current = false;
            sound.playCooldownReady();
          }
        }
      }
    }, 40);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isReady = remainingMs === 0;
  // progress goes from 0.0 (just started cooldown) to 1.0 (ready)
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, (totalMs - remainingMs) / totalMs)) : 1;
  const remainingSeconds = (remainingMs / 1000).toFixed(1);

  const isCooldownActive = useCallback(() => {
    return Date.now() < cooldownEndRef.current;
  }, []);

  const getRemainingSeconds = useCallback(() => {
    const remaining = Math.max(0, cooldownEndRef.current - Date.now());
    return (remaining / 1000).toFixed(1);
  }, []);

  return {
    isReady,
    progress,
    remainingMs,
    remainingSeconds,
    totalMs,
    startCooldown,
    isCooldownActive,
    getRemainingSeconds,
  };
}
