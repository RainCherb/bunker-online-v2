import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Shield, AlertTriangle, Clock, Users, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import PlayerCard from '@/components/game/PlayerCard';
import CharacterPanel from '@/components/game/CharacterPanel';
import GameInfo from '@/components/game/GameInfo';
import VotingPanel from '@/components/game/VotingPanel';
import GameOverScreen from '@/components/game/GameOverScreen';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { gameState, currentPlayer, nextPhase } = useGame();
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);

  useEffect(() => {
    if (!gameState || gameState.id !== gameId) {
      navigate('/');
    }
  }, [gameState, gameId, navigate]);

  if (!gameState || !currentPlayer) return null;

  if (gameState.phase === 'gameover') {
    return <GameOverScreen />;
  }

  const alivePlayers = gameState.players.filter(p => !p.isEliminated);
  const isVotingPhase = gameState.phase === 'voting' || gameState.phase === 'defense';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 radiation-gradient opacity-30" />
      <div className="absolute inset-0 scanline pointer-events-none opacity-50" />

      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 p-4 border-b border-border bg-card/80 backdrop-blur">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                <span className="font-display text-lg tracking-wider text-primary">БУНКЕР</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-display text-sm text-secondary">РАУНД {gameState.currentRound}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{alivePlayers.length}/{gameState.bunkerSlots} мест</span>
              </div>
              <button
                onClick={() => setShowCharacterPanel(!showCharacterPanel)}
                className="bunker-button-secondary !py-2 !px-4 text-sm"
              >
                Мой персонаж
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex">
          {/* Left Panel - Game Info */}
          <aside className="w-80 flex-shrink-0 border-r border-border bg-card/50 overflow-y-auto hidden lg:block">
            <GameInfo />
          </aside>

          {/* Center - Players Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {/* Phase Indicator */}
              <motion.div
                key={gameState.phase}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center"
              >
                <h2 className="font-display text-2xl text-primary text-glow">
                  {getPhaseTitle(gameState.phase)}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {getPhaseDescription(gameState.phase)}
                </p>
              </motion.div>

              {/* Voting Panel */}
              {isVotingPhase && <VotingPanel />}

              {/* Players Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {gameState.players.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    index={index}
                    isCurrentPlayer={player.id === currentPlayer.id}
                    isCurrentTurn={gameState.currentPlayerIndex === index}
                  />
                ))}
              </div>

              {/* Phase Control (Host) */}
              {currentPlayer.isHost && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 text-center"
                >
                  <button
                    onClick={nextPhase}
                    className="bunker-button"
                  >
                    Следующая фаза
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Panel - Character Panel */}
          {showCharacterPanel && (
            <aside className="w-96 flex-shrink-0 border-l border-border bg-card/50 overflow-y-auto">
              <CharacterPanel 
                player={currentPlayer} 
                isOwn={true}
                onClose={() => setShowCharacterPanel(false)}
              />
            </aside>
          )}
        </main>
      </div>
    </div>
  );
};

function getPhaseTitle(phase: string): string {
  const titles: Record<string, string> = {
    introduction: 'ЗНАКОМСТВО',
    turn: 'ХОД ИГРОКОВ',
    discussion: 'ОБСУЖДЕНИЕ',
    defense: 'ОПРАВДАНИЕ',
    voting: 'ГОЛОСОВАНИЕ',
    results: 'РЕЗУЛЬТАТЫ',
    farewell: 'ПРОЩАЛЬНАЯ РЕЧЬ',
  };
  return titles[phase] || phase.toUpperCase();
}

function getPhaseDescription(phase: string): string {
  const descriptions: Record<string, string> = {
    introduction: 'Игроки представляют своих персонажей и раскрывают профессию',
    turn: 'Каждый игрок по очереди раскрывает характеристики своего персонажа',
    discussion: 'Общее обсуждение — 1 минута на всех игроков',
    defense: 'Время для оправдательных речей — 30 секунд каждому',
    voting: 'Голосование за исключение игрока из лагеря',
    results: 'Подведение итогов голосования',
    farewell: 'Прощальная речь изгнанного игрока — 15 секунд',
  };
  return descriptions[phase] || '';
}

export default GamePage;
