import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface GameTimerProps {
  timeRemaining: number;
  isRunning: boolean;
  label?: string;
  showWarning?: boolean;
}

const GameTimer = ({ timeRemaining, isRunning, label, showWarning = true }: GameTimerProps) => {
  const isLow = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
        isCritical && showWarning
          ? 'bg-destructive/20 border-destructive text-destructive animate-pulse'
          : isLow && showWarning
            ? 'bg-secondary/20 border-secondary text-secondary'
            : 'bg-muted/50 border-border text-foreground'
      }`}
    >
      <Clock className={`w-5 h-5 ${isRunning ? 'animate-spin-slow' : ''}`} />
      <div className="flex flex-col">
        {label && <span className="text-xs opacity-70">{label}</span>}
        <span className="font-display text-lg tabular-nums">{formatTime(timeRemaining)}</span>
      </div>
    </motion.div>
  );
};

export default GameTimer;
