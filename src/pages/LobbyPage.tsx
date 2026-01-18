import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Shield, Users, Copy, Check, AlertTriangle, Play, Loader2, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const LobbyPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { gameState, currentPlayer, startGame, loadGame, isLoading, clearSession, isAuthLoading } = useGame();
  const { userId, ensureAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Try to load game if not in state - uses auth.uid() as player ID
  useEffect(() => {
    const tryLoadGame = async () => {
      if (!gameState && gameId && !isAuthLoading) {
        // Ensure we're authenticated first
        const user = await ensureAuthenticated();
        if (user) {
          const success = await loadGame(gameId, user.id);
          if (!success) {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      }
    };
    
    tryLoadGame();
  }, [gameState, gameId, loadGame, navigate, isAuthLoading, ensureAuthenticated]);

  useEffect(() => {
    if (gameState && gameState.id !== gameId) {
      navigate('/');
    }
  }, [gameState, gameId, navigate]);

  useEffect(() => {
    if (gameState?.phase !== 'lobby' && gameState?.phase !== undefined) {
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

  const handleStartGame = async () => {
    setIsStarting(true);
    await startGame();
    setIsStarting(false);
  };

  const handleLeaveGame = () => {
    clearSession();
    navigate('/');
  };

  const canStart = gameState && gameState.players.length >= 6;
  const isHost = currentPlayer?.isHost;

  if (isLoading || isAuthLoading || !gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка игры...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 radiation-gradient" />
      <div className="absolute inset-0 scanline pointer-events-none" />

      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 sm:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <span className="font-display text-base sm:text-xl tracking-wider text-primary">БУНКЕР 3.1</span>
          </div>
          <button
            onClick={handleLeaveGame}
            className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title="Покинуть игру"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </motion.header>

        <div className="max-w-4xl mx-auto">
          {/* Game Code Card - Mobile optimized */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bunker-card text-center mb-4 sm:mb-8 p-4 sm:p-6"
          >
            <h2 className="font-display text-sm sm:text-lg text-muted-foreground mb-2">КОД ИГРЫ</h2>
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <span className="font-display text-2xl xs:text-3xl sm:text-5xl tracking-[0.15em] sm:tracking-[0.3em] text-primary text-glow break-all">
                {gameId}
              </span>
              <button
                onClick={copyCode}
                className="p-2 sm:p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                ) : (
                  <Copy className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                )}
              </button>
            </div>
            <p className="mt-3 sm:mt-4 text-xs sm:text-base text-muted-foreground">
              Поделитесь этим кодом с друзьями для присоединения к игре
            </p>
          </motion.div>

          {/* Players Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bunker-card mb-4 sm:mb-8 p-4 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="font-display text-base sm:text-xl">ВРЕМЕННЫЙ ЛАГЕРЬ</h2>
              </div>
              <span className="font-display text-sm sm:text-lg text-secondary">
                {gameState.players.length}/15
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
              {gameState.players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-2 sm:p-4 rounded-lg border-2 ${
                    player.isHost 
                      ? 'border-secondary bg-secondary/10' 
                      : 'border-primary/30 bg-muted/30'
                  } ${player.id === currentPlayer?.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 rounded-full bg-primary/20 flex items-center justify-center font-display text-sm sm:text-xl text-primary">
                      {index + 1}
                    </div>
                    <p className="font-medium truncate text-xs sm:text-base">{player.name}</p>
                    {player.isHost && (
                      <span className="text-[10px] sm:text-xs text-secondary font-display">ВЕДУЩИЙ</span>
                    )}
                    {player.id === currentPlayer?.id && !player.isHost && (
                      <span className="text-[10px] sm:text-xs text-primary font-display">ВЫ</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: Math.max(0, 6 - gameState.players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-2 sm:p-4 rounded-lg border-2 border-dashed border-muted opacity-50"
                >
                  <div className="text-center">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 rounded-full bg-muted/30 flex items-center justify-center">
                      <Users className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground text-xs sm:text-base">Ожидание...</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning if not enough players */}
            {!canStart && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-secondary/10 border border-secondary/30 flex items-start sm:items-center gap-2 sm:gap-3"
              >
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-secondary flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-secondary text-xs sm:text-base">
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
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                className={`bunker-button inline-flex items-center gap-3 ${
                  !canStart || isStarting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    ЗАПУСК...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    НАЧАТЬ ИГРУ
                  </>
                )}
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
