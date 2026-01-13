import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Shield, Clock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import PlayerCard from '@/components/game/PlayerCard';
import CharacterPanel from '@/components/game/CharacterPanel';
import GameInfo from '@/components/game/GameInfo';
import VotingPanel from '@/components/game/VotingPanel';
import GameOverScreen from '@/components/game/GameOverScreen';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { gameState, currentPlayer, nextPhase, nextPlayerTurn, skipVoting, getCurrentTurnPlayer, loadGame, isLoading } = useGame();
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);

  // Try to load game if not in state
  useEffect(() => {
    if (!gameState && gameId) {
      const savedPlayerId = localStorage.getItem('bunker_player_id');
      if (savedPlayerId) {
        loadGame(gameId, savedPlayerId).then((success) => {
          if (!success) {
            navigate('/');
          }
        });
      } else {
        navigate('/');
      }
    }
  }, [gameState, gameId, loadGame, navigate]);

  useEffect(() => {
    if (gameState && gameState.id !== gameId) {
      navigate('/');
    }
  }, [gameState, gameId, navigate]);

  // Show loading if loading or no game state yet
  if (isLoading || !gameState || !currentPlayer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка игры...</p>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'gameover') {
    return <GameOverScreen />;
  }

  const alivePlayers = gameState.players.filter(p => !p.isEliminated);
  const isVotingPhase = gameState.phase === 'voting' || gameState.phase === 'defense';
  const isResultsPhase = gameState.phase === 'results';
  const isTurnPhase = gameState.phase === 'turn';
  const currentTurnPlayer = getCurrentTurnPlayer();
  const isMyTurn = currentTurnPlayer?.id === currentPlayer.id;

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
                  {getPhaseDescription(gameState.phase, currentTurnPlayer?.name)}
                </p>
                
                {/* Current turn indicator */}
                {isTurnPhase && currentTurnPlayer && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className={`mt-4 inline-block px-6 py-3 rounded-lg ${
                      isMyTurn 
                        ? 'bg-primary/20 border-2 border-primary text-primary' 
                        : 'bg-muted/50 border border-border'
                    }`}
                  >
                    <span className="font-display">
                      {isMyTurn ? '🎯 ВАШ ХОД — РАСКРОЙТЕ ХАРАКТЕРИСТИКУ' : `Ходит: ${currentTurnPlayer.name}`}
                    </span>
                  </motion.div>
                )}
              </motion.div>

              {/* Voting Panel */}
              {(isVotingPhase || isResultsPhase) && <VotingPanel />}

              {/* First Round Skip Voting Option */}
              {gameState.phase === 'discussion' && gameState.currentRound === 1 && currentPlayer.isHost && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bunker-card mb-6 text-center"
                >
                  <p className="text-muted-foreground mb-4">
                    В первом раунде голосование можно пропустить
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button onClick={skipVoting} className="bunker-button-secondary">
                      Пропустить голосование
                    </button>
                    <button onClick={nextPhase} className="bunker-button">
                      Перейти к защите
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Players Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {gameState.players.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    index={index}
                    isCurrentPlayer={player.id === currentPlayer.id}
                    isCurrentTurn={currentTurnPlayer?.id === player.id && isTurnPhase}
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
                  {getHostControls(gameState.phase, nextPhase, nextPlayerTurn)}
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
    defense: 'ЗАЩИТНАЯ РЕЧЬ',
    voting: 'ГОЛОСОВАНИЕ',
    results: 'РЕЗУЛЬТАТЫ ГОЛОСОВАНИЯ',
    farewell: 'ПРОЩАЛЬНАЯ РЕЧЬ',
  };
  return titles[phase] || phase.toUpperCase();
}

function getPhaseDescription(phase: string, currentPlayerName?: string): string {
  const descriptions: Record<string, string> = {
    introduction: 'Игроки представляют своих персонажей и раскрывают профессию',
    turn: currentPlayerName ? `Сейчас ходит: ${currentPlayerName}` : 'Каждый игрок раскрывает характеристики своего персонажа',
    discussion: 'Общее обсуждение — обсудите, кого изгнать',
    defense: 'Время для защитных речей — каждый может высказаться',
    voting: 'Голосование за исключение игрока из бункера',
    results: 'Подведение итогов голосования',
    farewell: 'Прощальная речь изгнанного игрока',
  };
  return descriptions[phase] || '';
}

function getHostControls(phase: string, nextPhase: () => void, nextPlayerTurn: () => void) {
  switch (phase) {
    case 'introduction':
      return (
        <button onClick={nextPhase} className="bunker-button">
          Начать раунд
        </button>
      );
    case 'turn':
      return (
        <button onClick={nextPlayerTurn} className="bunker-button">
          Следующий игрок
        </button>
      );
    case 'discussion':
      return null; // Controls are above
    case 'defense':
      return (
        <button onClick={nextPhase} className="bunker-button">
          Начать голосование
        </button>
      );
    case 'farewell':
      return (
        <button onClick={nextPhase} className="bunker-button">
          Следующий раунд
        </button>
      );
    default:
      return null;
  }
}

export default GamePage;
