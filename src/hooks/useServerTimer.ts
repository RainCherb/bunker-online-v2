import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Keep callback ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Reset trigger when phaseEndsAt changes
  useEffect(() => {
    const currentPhaseStr = phaseEndsAt?.toISOString() || null;
    if (currentPhaseStr !== lastPhaseEndsAtRef.current) {
      hasTriggeredRef.current = false;
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
    setTimeRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        // Small delay to ensure all clients get the same timing
        setTimeout(() => {
          onTimeUpRef.current();
        }, 100);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseEndsAt, enabled]);

  const isRunning = enabled && phaseEndsAt !== null && timeRemaining > 0;

  return {
    timeRemaining,
    isRunning,
  };
}
