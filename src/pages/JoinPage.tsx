import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import bunkerHero from '@/assets/bunker-hero.jpg';

const JoinPage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { joinGame, loadGame, gameState, currentPlayer, isLoading } = useGame();
  const { userId, ensureAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Check if user is already in this game
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!gameId || isAuthLoading) return;
      
      const user = await ensureAuthenticated();
      if (user) {
        // Try to load existing game session
        const success = await loadGame(gameId, user.id);
        if (success) {
          // User is already in this game, redirect to lobby or game
          if (gameState?.phase === 'lobby') {
            navigate(`/lobby/${gameId}`);
          } else {
            navigate(`/game/${gameId}`);
          }
          return;
        }
      }
      setCheckingExisting(false);
    };

    checkExistingSession();
  }, [gameId, isAuthLoading, ensureAuthenticated, loadGame, navigate, gameState?.phase]);

  // Redirect if already in game
  useEffect(() => {
    if (gameState && currentPlayer && gameState.id === gameId) {
      if (gameState.phase === 'lobby') {
        navigate(`/lobby/${gameId}`);
      } else {
        navigate(`/game/${gameId}`);
      }
    }
  }, [gameState, currentPlayer, gameId, navigate]);

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Введите ваше имя');
      return;
    }
    if (!gameId) {
      setError('Неверный код игры');
      return;
    }
    
    setError('');
    setIsJoining(true);
    
    const success = await joinGame(gameId.toUpperCase(), playerName.trim());
    
    if (success) {
      navigate(`/lobby/${gameId.toUpperCase()}`);
    } else {
      setError('Игра не найдена или уже началась');
      setIsJoining(false);
    }
  };

  if (checkingExisting || isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Проверка сессии...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bunkerHero})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 scanline pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Shield className="w-8 h-8 text-primary" />
            <span className="font-display text-xl tracking-wider text-primary">БУНКЕР 3.1</span>
          </motion.div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="w-full max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-glow mb-2">
                ПРИСОЕДИНИТЬСЯ
              </h1>
              <p className="text-lg text-muted-foreground">
                Вас пригласили в игру
              </p>
              <div className="mt-4 font-display text-2xl tracking-[0.2em] text-secondary text-glow-warning">
                {gameId?.toUpperCase()}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bunker-card"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-muted-foreground">
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Введите имя..."
                    className="bunker-input"
                    maxLength={50}
                    disabled={isJoining || isLoading}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/')}
                    className="bunker-button-secondary flex-1"
                    disabled={isJoining || isLoading}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleJoinGame}
                    className="bunker-button flex-1 flex items-center justify-center gap-2"
                    disabled={isJoining || isLoading}
                  >
                    {isJoining || isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Загрузка...
                      </>
                    ) : (
                      'Войти в игру'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JoinPage;
