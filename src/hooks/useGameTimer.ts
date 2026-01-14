import { useState, useEffect, useCallback, useRef } from 'react';

interface UseGameTimerOptions {
  initialTime: number;
  onTimeUp: () => void;
  autoStart?: boolean;
}

export function useGameTimer({ initialTime, onTimeUp, autoStart = false }: UseGameTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const onTimeUpRef = useRef(onTimeUp);
  const hasTriggeredRef = useRef(false);

  // Keep callback ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Reset timer
  const reset = useCallback((newTime?: number) => {
    setTimeRemaining(newTime ?? initialTime);
    setIsRunning(false);
    hasTriggeredRef.current = false;
  }, [initialTime]);

  // Start timer
  const start = useCallback(() => {
    hasTriggeredRef.current = false;
    setIsRunning(true);
  }, []);

  // Stop timer
  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            // Use setTimeout to avoid state update during render
            setTimeout(() => onTimeUpRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  return {
    timeRemaining,
    isRunning,
    start,
    stop,
    reset,
  };
}

