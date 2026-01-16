import { useState, useEffect, useRef } from 'react';

interface UseServerTimerOptions {
  phaseEndsAt: Date | null;
  onTimeUp: () => void;
  enabled?: boolean;
}

export function useServerTimer({ phaseEndsAt, onTimeUp, enabled = true }: UseServerTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const onTimeUpRef = useRef(onTimeUp);
  const hasTriggeredRef = useRef(false);
  const lastPhaseEndsAtRef = useRef<string | null>(null);
  const isTriggering = useRef(false);

  // Keep callback ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Reset trigger when phaseEndsAt changes
  useEffect(() => {
    const currentPhaseStr = phaseEndsAt?.toISOString() || null;
    if (currentPhaseStr !== lastPhaseEndsAtRef.current) {
      console.log('[Timer] Phase changed, resetting trigger:', currentPhaseStr);
      hasTriggeredRef.current = false;
      isTriggering.current = false;
      lastPhaseEndsAtRef.current = currentPhaseStr;
    }
  }, [phaseEndsAt]);

  // Calculate and update time remaining
  useEffect(() => {
    if (!enabled || !phaseEndsAt) {
      setTimeRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const endsAt = phaseEndsAt.getTime();
      const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));
      return remaining;
    };

    // Initial calculation
    const initialRemaining = calculateRemaining();
    setTimeRemaining(initialRemaining);
    console.log('[Timer] Initial time:', initialRemaining, 'seconds');

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      // Only trigger once and prevent double triggers
      if (remaining <= 0 && !hasTriggeredRef.current && !isTriggering.current) {
        hasTriggeredRef.current = true;
        isTriggering.current = true;
        console.log('[Timer] Time up! Triggering callback...');
        
        // Execute immediately without delay
        try {
          onTimeUpRef.current();
        } catch (error) {
          console.error('[Timer] Error in onTimeUp callback:', error);
        } finally {
          // Reset triggering flag after a delay to prevent rapid re-triggers
          setTimeout(() => {
            isTriggering.current = false;
          }, 2000);
        }
      }
    }, 500); // Update every 500ms for more responsive UI

    return () => clearInterval(interval);
  }, [phaseEndsAt, enabled]);

  const isRunning = enabled && phaseEndsAt !== null && timeRemaining > 0;

  return {
    timeRemaining,
    isRunning,
  };
}
