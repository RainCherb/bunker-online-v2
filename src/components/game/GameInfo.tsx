import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { AlertTriangle, Clock, Package, Shield, Info } from 'lucide-react';

const GameInfo = () => {
  const { gameState } = useGame();

  if (!gameState) return null;

  const { catastrophe, bunker } = gameState;

  return (
    <div className="p-6 space-y-6">
      {/* Catastrophe Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="font-display text-sm text-destructive">КАТАСТРОФА</h3>
        </div>
        <h4 className="font-display text-lg text-destructive text-glow-danger mb-2">
          {catastrophe.name}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {catastrophe.description}
        </p>
        <div className="flex items-center gap-2 mt-3 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span>Время выживания: {catastrophe.survivalTime}</span>
        </div>
      </motion.div>

      {/* Bunker Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-lg bg-primary/10 border-2 border-primary/30"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-display text-sm text-primary">БУНКЕР</h3>
        </div>
        <h4 className="font-display text-lg text-primary text-glow mb-3">
          {bunker.name}
        </h4>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <span>{bunker.description}</span>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="font-display text-xs text-muted-foreground mb-2">В БУНКЕРЕ ИМЕЕТСЯ:</h5>
          <div className="flex flex-wrap gap-2">
            {bunker.supplies.map((item, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs rounded bg-muted border border-border"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Game Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-lg bg-muted/30 border border-border"
      >
        <h3 className="font-display text-sm text-muted-foreground mb-3">СТАТИСТИКА</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-display text-2xl text-primary">{gameState.bunkerSlots}</div>
            <div className="text-xs text-muted-foreground">Мест в бункере</div>
          </div>
          <div>
            <div className="font-display text-2xl text-secondary">{gameState.currentRound}/7</div>
            <div className="text-xs text-muted-foreground">Раунд</div>
          </div>
          <div>
            <div className="font-display text-2xl text-foreground">
              {gameState.players.filter(p => !p.isEliminated).length}
            </div>
            <div className="text-xs text-muted-foreground">Выживших</div>
          </div>
          <div>
            <div className="font-display text-2xl text-destructive">
              {gameState.players.filter(p => p.isEliminated).length}
            </div>
            <div className="text-xs text-muted-foreground">Изгнанных</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GameInfo;
