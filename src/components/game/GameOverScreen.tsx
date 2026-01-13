import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Trophy, Skull, Home, RefreshCw } from 'lucide-react';

const GameOverScreen = () => {
  const { gameState } = useGame();
  const navigate = useNavigate();

  if (!gameState) return null;

  const survivors = gameState.players.filter(p => !p.isEliminated);
  const eliminated = gameState.players.filter(p => p.isEliminated);

  const handleGoHome = () => {
    // Clear session storage
    localStorage.removeItem('bunker_game_id');
    localStorage.removeItem('bunker_player_id');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 radiation-gradient" />
      <div className="absolute inset-0 scanline pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-glow"
          >
            <Shield className="w-12 h-12 text-primary" />
          </motion.div>
          <h1 className="font-display text-5xl text-primary text-glow mb-4">
            ИГРА ОКОНЧЕНА
          </h1>
          <p className="text-xl text-muted-foreground">
            Двери бункера закрыты. Судьба решена.
          </p>
        </motion.div>

        {/* Game Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bunker-card mb-8 text-center"
        >
          <h2 className="font-display text-xl text-secondary mb-4">ИТОГИ</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-display text-primary">{gameState.currentRound}</div>
              <div className="text-sm text-muted-foreground">Раундов</div>
            </div>
            <div>
              <div className="text-3xl font-display text-success">{survivors.length}</div>
              <div className="text-sm text-muted-foreground">Выжило</div>
            </div>
            <div>
              <div className="text-3xl font-display text-destructive">{eliminated.length}</div>
              <div className="text-sm text-muted-foreground">Изгнано</div>
            </div>
          </div>
        </motion.div>

        {/* Survivors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bunker-card mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-success" />
            <h2 className="font-display text-xl text-success">ВЫЖИВШИЕ — ПОПАЛИ В БУНКЕР</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {survivors.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="p-4 rounded-lg bg-success/10 border-2 border-success/30 text-center"
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-success/20 flex items-center justify-center font-display text-lg text-success">
                  {index + 1}
                </div>
                <p className="font-display text-success">{player.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{player.characteristics.profession}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Eliminated */}
        {eliminated.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bunker-card mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Skull className="w-6 h-6 text-destructive" />
              <h2 className="font-display text-xl text-destructive">ИЗГНАННЫЕ — ОСТАЛИСЬ СНАРУЖИ</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {eliminated.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30 text-center opacity-70"
                >
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Skull className="w-6 h-6 text-destructive" />
                  </div>
                  <p className="font-display text-destructive">{player.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{player.characteristics.profession}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center flex gap-4 justify-center"
        >
          <button
            onClick={handleGoHome}
            className="bunker-button inline-flex items-center gap-3"
          >
            <Home className="w-5 h-5" />
            В ГЛАВНОЕ МЕНЮ
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default GameOverScreen;
