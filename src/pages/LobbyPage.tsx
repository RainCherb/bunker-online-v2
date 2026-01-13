import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Shield, Users, Copy, Check, AlertTriangle, Play } from 'lucide-react';
import { useState, useEffect } from 'react';

const LobbyPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { gameState, currentPlayer, startGame } = useGame();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!gameState || gameState.id !== gameId) {
      navigate('/');
    }
  }, [gameState, gameId, navigate]);

  useEffect(() => {
    if (gameState?.phase !== 'lobby') {
      navigate(`/game/${gameId}`);
    }
  }, [gameState?.phase, gameId, navigate]);

  const copyCode = () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canStart = gameState && gameState.players.length >= 6;
  const isHost = currentPlayer?.isHost;

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 radiation-gradient" />
      <div className="absolute inset-0 scanline pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <span className="font-display text-xl tracking-wider text-primary">БУНКЕР 3.1</span>
          </div>
        </motion.header>

        <div className="max-w-4xl mx-auto">
          {/* Game Code Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bunker-card text-center mb-8"
          >
            <h2 className="font-display text-lg text-muted-foreground mb-2">КОД ИГРЫ</h2>
            <div className="flex items-center justify-center gap-4">
              <span className="font-display text-5xl tracking-[0.3em] text-primary text-glow">
                {gameId}
              </span>
              <button
                onClick={copyCode}
                className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                {copied ? (
                  <Check className="w-6 h-6 text-success" />
                ) : (
                  <Copy className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="mt-4 text-muted-foreground">
              Поделитесь этим кодом с друзьями для присоединения к игре
            </p>
          </motion.div>

          {/* Players Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bunker-card mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                <h2 className="font-display text-xl">ВРЕМЕННЫЙ ЛАГЕРЬ</h2>
              </div>
              <span className="font-display text-lg text-secondary">
                {gameState.players.length}/15 игроков
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {gameState.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border-2 ${
                    player.isHost 
                      ? 'border-secondary bg-secondary/10' 
                      : 'border-primary/30 bg-muted/30'
                  } ${player.id === currentPlayer?.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center font-display text-xl text-primary">
                      {index + 1}
                    </div>
                    <p className="font-medium truncate">{player.name}</p>
                    {player.isHost && (
                      <span className="text-xs text-secondary font-display">ВЕДУЩИЙ</span>
                    )}
                    {player.id === currentPlayer?.id && !player.isHost && (
                      <span className="text-xs text-primary font-display">ВЫ</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 6 - gameState.players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-4 rounded-lg border-2 border-dashed border-muted opacity-50"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted/30 flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">Ожидание...</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning if not enough players */}
            {!canStart && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-4 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center gap-3"
              >
                <AlertTriangle className="w-6 h-6 text-secondary flex-shrink-0" />
                <p className="text-secondary">
                  Необходимо минимум 6 игроков для начала игры. Ожидаем ещё {6 - gameState.players.length} игрок(ов).
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Start Button (Host only) */}
          {isHost && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`bunker-button inline-flex items-center gap-3 ${
                  !canStart ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Play className="w-6 h-6" />
                НАЧАТЬ ИГРУ
              </button>
            </motion.div>
          )}

          {!isHost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-muted-foreground"
            >
              <p className="font-display">Ожидаем начала игры от ведущего...</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
