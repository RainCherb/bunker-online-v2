import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { Shield, Clock, Users, ChevronRight, LogOut } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import PlayerCard from '@/components/game/PlayerCard';
import CharacterPanel from '@/components/game/CharacterPanel';
import GameInfo from '@/components/game/GameInfo';
import VotingPanel from '@/components/game/VotingPanel';
import GameOverScreen from '@/components/game/GameOverScreen';
import GameTimer from '@/components/game/GameTimer';
import PlayerDetailModal from '@/components/game/PlayerDetailModal';
import CardRevealAnimation from '@/components/game/CardRevealAnimation';
import { useServerTimer } from '@/hooks/useServerTimer';
import { Player, Characteristics } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';

interface RevealInfo {
  playerName: string;
  characteristicKey: keyof Characteristics;
  characteristicValue: string;
}

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { userId, ensureAuthenticated } = useAuth();
  const { 
    gameState, 
    currentPlayer, 
    nextPhase, 
    nextPlayerTurn, 
    skipVoting, 
    getCurrentTurnPlayer, 
    loadGame, 
    isLoading,
    isAuthLoading,
    autoRevealRandomCharacteristic,
    hasRevealedThisTurn,
    clearSession,
    phaseEndsAt,
    turnHasRevealed
  } = useGame();
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [revealAnimation, setRevealAnimation] = useState<RevealInfo | null>(null);
  const prevPlayersRef = useRef<Player[]>([]);

  const currentTurnPlayer = getCurrentTurnPlayer();
  const isMyTurn = currentTurnPlayer?.id === currentPlayer?.id;
  const isTurnPhase = gameState?.phase === 'turn';
  const isDiscussionPhase = gameState?.phase === 'discussion';
  const playerRevealed = turnHasRevealed;

  // Detect new card reveals
  useEffect(() => {
    if (!gameState?.players) return;

    const prevPlayers = prevPlayersRef.current;
    
    // Compare revealed characteristics
    for (const player of gameState.players) {
      const prevPlayer = prevPlayers.find(p => p.id === player.id);
      if (prevPlayer) {
        // Check if any new characteristic was revealed
        for (const charKey of player.revealedCharacteristics) {
          if (!prevPlayer.revealedCharacteristics.includes(charKey)) {
            // New reveal detected!
            const typedKey = charKey as keyof Characteristics;
            setRevealAnimation({
              playerName: player.name,
              characteristicKey: typedKey,
              characteristicValue: player.characteristics[typedKey] || ''
            });
            break;
          }
        }
      }
    }

    prevPlayersRef.current = gameState.players.map(p => ({
      ...p,
      revealedCharacteristics: [...p.revealedCharacteristics]
    }));
  }, [gameState?.players]);

  // Handle turn timeout - only host executes this
  const handleTurnTimeout = useCallback(async () => {
    if (!currentTurnPlayer || !isTurnPhase || !currentPlayer?.isHost) return;
    
    console.log('[Timeout] Turn timeout triggered, host executing...');
    console.log('[Timeout] turnHasRevealed:', turnHasRevealed);
    
    // If current turn player hasn't revealed, auto-reveal for them first
    if (!turnHasRevealed) {
      console.log('[Timeout] Auto-revealing for player:', currentTurnPlayer.name);
      await autoRevealRandomCharacteristic(currentTurnPlayer.id);
      // After auto-reveal, the timer will be reset to 5 minutes
      // The next timeout will then call nextPlayerTurn
    } else {
      // Player already revealed, time for discussion is up - move to next player
      console.log('[Timeout] Player already revealed, moving to next player');
      await nextPlayerTurn();
    }
  }, [currentTurnPlayer, isTurnPhase, turnHasRevealed, autoRevealRandomCharacteristic, currentPlayer?.isHost, nextPlayerTurn]);

  // Handle discussion timeout (after round 1) - only host executes
  const handleDiscussionTimeout = useCallback(async () => {
    if (!isDiscussionPhase || !currentPlayer?.isHost || gameState?.currentRound !== 1) return;
    console.log('Discussion timeout triggered, host executing...');
    await nextPhase();
  }, [isDiscussionPhase, currentPlayer?.isHost, nextPhase, gameState?.currentRound]);

  // Server-synced turn timer
  const turnTimer = useServerTimer({
    phaseEndsAt: isTurnPhase ? phaseEndsAt : null,
    onTimeUp: handleTurnTimeout,
    enabled: isTurnPhase && currentPlayer?.isHost === true
  });

  // Server-synced discussion timer (only for round 1)
  const discussionTimer = useServerTimer({
    phaseEndsAt: isDiscussionPhase && gameState?.currentRound === 1 ? phaseEndsAt : null,
    onTimeUp: handleDiscussionTimeout,
    enabled: isDiscussionPhase && gameState?.currentRound === 1 && currentPlayer?.isHost === true
  });

  // Display timers for all users (not just host)
  const displayTurnTimer = useServerTimer({
    phaseEndsAt: isTurnPhase ? phaseEndsAt : null,
    onTimeUp: () => {}, // Non-host doesn't trigger actions
    enabled: isTurnPhase
  });

  const displayDiscussionTimer = useServerTimer({
    phaseEndsAt: isDiscussionPhase && gameState?.currentRound === 1 ? phaseEndsAt : null,
    onTimeUp: () => {},
    enabled: isDiscussionPhase && gameState?.currentRound === 1
  });

  // Handle next player button click
  const handleNextPlayer = async () => {
    await nextPlayerTurn();
  };

  // Handle leave game
  const handleLeaveGame = () => {
    clearSession();
    navigate('/');
  };

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

  // Show loading if loading or no game state yet
  if (isLoading || isAuthLoading || !gameState || !currentPlayer) {
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 radiation-gradient opacity-30" />
      <div className="absolute inset-0 scanline pointer-events-none opacity-50" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Mobile optimized */}
        <header className="flex-shrink-0 p-2 sm:p-4 border-b border-border bg-card/80 backdrop-blur">
          <div className="container mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <span className="font-display text-sm sm:text-lg tracking-wider text-primary hidden sm:inline">БУНКЕР</span>
              </div>
              <div className="h-4 sm:h-6 w-px bg-border flex-shrink-0" />
              <div className="flex items-center gap-1 sm:gap-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <span className="font-display text-xs sm:text-sm text-secondary">РАУНД {gameState.currentRound}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <span>{alivePlayers.length}/{gameState.bunkerSlots}</span>
              </div>
              <button
                onClick={() => setShowCharacterPanel(!showCharacterPanel)}
                className="bunker-button-secondary !py-1.5 !px-2 sm:!py-2 sm:!px-4 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Мой персонаж</span>
                <span className="sm:hidden">Персонаж</span>
              </button>
              <button
                onClick={handleLeaveGame}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                title="Покинуть игру"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content - Mobile optimized */}
        <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Panel - Game Info (hidden on mobile, shown as overlay) */}
          <aside className="w-80 flex-shrink-0 border-r border-border bg-card/50 overflow-y-auto hidden lg:block">
            <GameInfo />
          </aside>

          {/* Center - Main game area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="max-w-5xl mx-auto">
              {/* Phase Indicator with Timer */}
              <motion.div
                key={gameState.phase + gameState.currentPlayerIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="mb-4 sm:mb-6 text-center"
              >
                <h2 className="font-display text-lg sm:text-2xl text-primary text-glow">
                  {getPhaseTitle(gameState.phase)}
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">
                  {getPhaseDescription(gameState.phase, currentTurnPlayer?.name, gameState.currentRound)}
                </p>
                
                {/* Timer display */}
                {isTurnPhase && (
                  <div className="mt-3 sm:mt-4 flex flex-col items-center gap-2">
                    <GameTimer 
                      timeRemaining={displayTurnTimer.timeRemaining} 
                      isRunning={displayTurnTimer.isRunning}
                      label={playerRevealed ? "Время на обсуждение" : "До автораскрытия карты"}
                    />
                    
                    {/* Current turn indicator OR Next player button */}
                    {currentTurnPlayer && (
                      <>
                        {isMyTurn && playerRevealed ? (
                          // Show "Next Player" button after revealing
                          <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            onClick={handleNextPlayer}
                            className="mt-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-display text-sm sm:text-base flex items-center gap-2 hover:bg-primary/90 active:scale-95 transition-all duration-150"
                          >
                            <span>СЛЕДУЮЩИЙ ИГРОК</span>
                            <ChevronRight className="w-5 h-5" />
                          </motion.button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className={`mt-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base ${
                              isMyTurn 
                                ? 'bg-primary/20 border-2 border-primary text-primary' 
                                : 'bg-muted/50 border border-border'
                            }`}
                          >
                            <span className="font-display">
                              {isMyTurn 
                                ? (gameState.currentRound === 1 
                                    ? '🎯 ВАШ ХОД — ОТКРОЙТЕ ПРОФЕССИЮ' 
                                    : '🎯 ВАШ ХОД — ОТКРОЙТЕ КАРТУ')
                                : `Ходит: ${currentTurnPlayer.name}`}
                            </span>
                          </motion.div>
                        )}
                      </>
                    )}

                    {/* Show "waiting for reveal" or "revealed" status */}
                    {currentTurnPlayer && !isMyTurn && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                        {playerRevealed 
                          ? `✅ ${currentTurnPlayer.name} раскрыл карту. Ожидание...` 
                          : `⏳ Ожидаем, когда ${currentTurnPlayer.name} раскроет карту`}
                      </p>
                    )}
                    
                    {/* Show status for current player */}
                    {currentTurnPlayer && isMyTurn && !playerRevealed && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                        Нажмите "Мой персонаж" чтобы раскрыть карту
                      </p>
                    )}
                  </div>
                )}

                {/* Discussion timer (after round 1) */}
                {isDiscussionPhase && gameState.currentRound === 1 && (
                  <div className="mt-3 sm:mt-4">
                    <GameTimer 
                      timeRemaining={displayDiscussionTimer.timeRemaining} 
                      isRunning={displayDiscussionTimer.isRunning}
                      label="До следующего раунда"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      Обсудите увиденные профессии перед раундом 2
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Voting Panel */}
              {(isVotingPhase || isResultsPhase) && <VotingPanel />}

              {/* First Round Skip Voting Option */}
              {gameState.phase === 'discussion' && gameState.currentRound > 1 && currentPlayer.isHost && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bunker-card mb-4 sm:mb-6 text-center"
                >
                  <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                    Время для обсуждения перед голосованием
                  </p>
                  <button onClick={nextPhase} className="bunker-button text-sm sm:text-base">
                    Перейти к защите
                  </button>
                </motion.div>
              )}

              {/* Players Grid - Mobile optimized with equal columns */}
              <div className="players-grid-mobile">
                {gameState.players.map((player, index) => (
                  <div 
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className="cursor-pointer"
                  >
                    <PlayerCard
                      player={player}
                      index={index}
                      isCurrentPlayer={player.id === currentPlayer.id}
                      isCurrentTurn={currentTurnPlayer?.id === player.id && isTurnPhase}
                      hasRevealedThisTurn={playerRevealed && currentTurnPlayer?.id === player.id}
                    />
                  </div>
                ))}
              </div>

              {/* Phase Control (for current turn player or host) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 sm:mt-8 text-center"
              >
                {getPhaseControls(
                  gameState.phase, 
                  nextPhase, 
                  handleNextPlayer, 
                  currentPlayer.isHost, 
                  isMyTurn,
                  playerRevealed,
                  gameState.currentRound,
                  skipVoting
                )}
              </motion.div>
            </div>
          </div>

          {/* Right Panel - Character Panel */}
          {showCharacterPanel && (
            <aside className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:w-96 lg:flex-shrink-0 lg:border-l lg:border-border bg-card lg:bg-card/50 overflow-y-auto">
              <CharacterPanel 
                player={currentPlayer} 
                isOwn={true}
                onClose={() => setShowCharacterPanel(false)}
              />
            </aside>
          )}

          {/* Player Detail Modal */}
          {selectedPlayer && (
            <PlayerDetailModal 
              player={selectedPlayer} 
              onClose={() => setSelectedPlayer(null)} 
            />
          )}

          {/* Card Reveal Animation */}
          <CardRevealAnimation
            playerName={revealAnimation?.playerName || ''}
            characteristicKey={revealAnimation?.characteristicKey || 'profession'}
            characteristicValue={revealAnimation?.characteristicValue || ''}
            isVisible={!!revealAnimation}
            onComplete={() => setRevealAnimation(null)}
          />
        </main>

        {/* Mobile Game Info Button */}
        <div className="lg:hidden fixed bottom-4 left-4 z-40">
          <MobileGameInfoButton />
        </div>
      </div>
    </div>
  );
};

// Mobile Game Info Button Component
const MobileGameInfoButton = () => {
  const [showInfo, setShowInfo] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setShowInfo(true)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
      >
        <Shield className="w-6 h-6" />
      </button>
      
      {showInfo && (
        <div className="fixed inset-0 bg-background/95 z-50 overflow-y-auto">
          <div className="p-4">
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 p-2"
            >
              ✕
            </button>
            <GameInfo />
          </div>
        </div>
      )}
    </>
  );
};

function getPhaseTitle(phase: string): string {
  const titles: Record<string, string> = {
    introduction: 'ЗНАКОМСТВО',
    turn: 'ХОД ИГРОКОВ',
    discussion: 'ОБСУЖДЕНИЕ',
    defense: 'ЗАЩИТНАЯ РЕЧЬ',
    voting: 'ГОЛОСОВАНИЕ',
    results: 'РЕЗУЛЬТАТЫ',
    farewell: 'ПРОЩАНИЕ',
  };
  return titles[phase] || phase.toUpperCase();
}

function getPhaseDescription(phase: string, currentPlayerName?: string, round?: number): string {
  const descriptions: Record<string, string> = {
    introduction: 'Хост начинает игру',
    turn: round === 1 
      ? `Раунд 1: Игроки раскрывают только профессию` 
      : `Раунд ${round}: Игроки раскрывают любую одну карту`,
    discussion: round === 1 
      ? 'Обсуждение профессий перед раундом 2' 
      : 'Обсудите, кого изгнать из бункера',
    defense: 'Время для защитных речей',
    voting: 'Голосование за исключение',
    results: 'Подведение итогов',
    farewell: 'Прощальная речь изгнанного',
  };
  return descriptions[phase] || '';
}

function getPhaseControls(
  phase: string, 
  nextPhase: () => void, 
  nextPlayerTurn: () => void, 
  isHost: boolean,
  isMyTurn: boolean,
  hasRevealed: boolean,
  currentRound: number,
  skipVoting: () => void
) {
  switch (phase) {
    case 'introduction':
      return isHost ? (
        <button onClick={nextPhase} className="bunker-button">
          Начать раунд
        </button>
      ) : null;
    case 'turn':
      // "Next Player" button is now shown at the top, so we only show host skip option here
      if (isHost && !isMyTurn) {
        return (
          <button onClick={nextPlayerTurn} className="bunker-button-secondary text-sm">
            Пропустить ход
          </button>
        );
      }
      return null;
    case 'discussion':
      if (currentRound === 1) {
        // After round 1 discussion, auto-transition or host can skip
        return isHost ? (
          <button onClick={nextPhase} className="bunker-button">
            Начать раунд 2
          </button>
        ) : null;
      }
      return null;
    case 'defense':
      return isHost ? (
        <button onClick={nextPhase} className="bunker-button">
          Начать голосование
        </button>
      ) : null;
    case 'farewell':
      return isHost ? (
        <button onClick={nextPhase} className="bunker-button">
          Следующий раунд
        </button>
      ) : null;
    default:
      return null;
  }
}

export default GamePage;
