import { motion } from 'framer-motion';
import { Shield, Users, Zap, BookOpen, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import bunkerHero from '@/assets/bunker-hero.jpg';

const HomePage = () => {
  const navigate = useNavigate();
  const { createGame, joinGame, isLoading, gameState, currentPlayer } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [error, setError] = useState('');

  // Redirect to active game if session is restored
  useEffect(() => {
    if (gameState && currentPlayer) {
      if (gameState.phase === 'lobby') {
        navigate(`/lobby/${gameState.id}`);
      } else {
        navigate(`/game/${gameState.id}`);
      }
    }
  }, [gameState, currentPlayer, navigate]);

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError('Введите ваше имя');
      return;
    }
    setError('');
    const gameId = await createGame(playerName.trim());
    if (gameId) {
      navigate(`/lobby/${gameId}`);
    } else {
      setError('Ошибка при создании игры');
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Введите ваше имя');
      return;
    }
    if (!gameCode.trim()) {
      setError('Введите код игры');
      return;
    }
    
    setError('');
    const success = await joinGame(gameCode.toUpperCase(), playerName.trim());
    if (success) {
      navigate(`/lobby/${gameCode.toUpperCase()}`);
    } else {
      setError('Игра не найдена или уже началась');
    }
  };

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
              className="text-center mb-12"
            >
              <h1 className="font-display text-5xl md:text-7xl font-bold text-glow mb-4">
                БУНКЕР
              </h1>
              <p className="font-display text-2xl md:text-3xl text-secondary text-glow-warning">
                ВЕРСИЯ 3.1
              </p>
              <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
                Социальная игра на выживание. Убедите других, что именно вы достойны места в бункере.
              </p>
            </motion.div>

            {/* Action Buttons / Forms */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bunker-card"
            >
              {mode === 'none' ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setMode('create')}
                    className="bunker-button w-full flex items-center justify-center gap-3"
                  >
                    <Zap className="w-5 h-5" />
                    Создать игру
                  </button>
                  <button
                    onClick={() => setMode('join')}
                    className="bunker-button-secondary w-full flex items-center justify-center gap-3"
                  >
                    <Users className="w-5 h-5" />
                    Присоединиться
                  </button>
                </div>
              ) : (
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
                      maxLength={20}
                      disabled={isLoading}
                    />
                  </div>

                  {mode === 'join' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-muted-foreground">
                        Код игры
                      </label>
                      <input
                        type="text"
                        value={gameCode}
                        onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                        placeholder="Введите код..."
                        className="bunker-input uppercase tracking-widest text-center font-display"
                        maxLength={6}
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {error && (
                    <p className="text-destructive text-sm text-center">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setMode('none');
                        setError('');
                      }}
                      className="bunker-button-secondary flex-1"
                      disabled={isLoading}
                    >
                      Назад
                    </button>
                    <button
                      onClick={mode === 'create' ? handleCreateGame : handleJoinGame}
                      className="bunker-button flex-1 flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        mode === 'create' ? 'Создать' : 'Войти'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 grid grid-cols-3 gap-4 text-center"
            >
              {[
                { label: '6-15', desc: 'игроков' },
                { label: '30-60', desc: 'минут' },
                { label: '∞', desc: 'веселья' },
              ].map((item, i) => (
                <div key={i} className="p-4">
                  <div className="font-display text-2xl text-primary">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </motion.div>

            {/* Rules Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center"
            >
              <Link
                to="/rules"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Читать правила игры</span>
              </Link>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-sm text-muted-foreground">
          <p>Бункер 3.1 — Социальная игра на выживание</p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
