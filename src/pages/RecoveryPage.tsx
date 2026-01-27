import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const RecoveryPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { ensureAuthenticated } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    const handleRecovery = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Недействительная ссылка восстановления');
        return;
      }

      try {
        // Decode the recovery token
        const decoded = atob(token);
        const [recoveryGameId, playerId] = decoded.split('|');

        if (!recoveryGameId || !playerId) {
          setStatus('error');
          setErrorMessage('Недействительная ссылка восстановления');
          return;
        }

        setGameId(recoveryGameId);

        // Ensure user is authenticated (anonymous auth)
        const user = await ensureAuthenticated();
        if (!user) {
          setStatus('error');
          setErrorMessage('Ошибка аутентификации');
          return;
        }

        // Call the RPC function to recover the player
        // The function handles all validation (game exists, not finished, player exists, etc.)
        const { data: recoverResult, error: recoverError } = await supabase.rpc('recover_player', {
          p_old_player_id: playerId,
          p_game_id: recoveryGameId,
        });

        if (recoverError) {
          if (import.meta.env.DEV) {
            console.error('Error recovering player:', recoverError);
          }
          
          // Parse error message for user-friendly display
          let errorMsg = 'Не удалось восстановить игрока';
          if (recoverError.message.includes('already in this game')) {
            errorMsg = 'Вы уже находитесь в этой игре как другой игрок';
          } else if (recoverError.message.includes('not found')) {
            errorMsg = 'Игрок или игра не найдены';
          } else if (recoverError.message.includes('finished game')) {
            errorMsg = 'Игра уже завершена';
          }
          
          setStatus('error');
          setErrorMessage(errorMsg);
          return;
        }

        // Success!
        setStatus('success');
        localStorage.setItem('bunker_game_id', recoveryGameId);
        
        // Now fetch game phase to determine redirect (user is now in the game)
        const { data: game } = await supabase
          .from('games')
          .select('phase')
          .eq('id', recoveryGameId)
          .single();
        
        // Redirect to appropriate page based on game phase
        setTimeout(() => {
          if (game?.phase === 'lobby') {
            navigate(`/lobby/${recoveryGameId}`);
          } else {
            navigate(`/game/${recoveryGameId}`);
          }
        }, 1500);

      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Recovery error:', error);
        }
        setStatus('error');
        setErrorMessage('Произошла ошибка при восстановлении');
      }
    };

    handleRecovery();
  }, [token, ensureAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-card border-2 border-primary/30 rounded-xl p-8 text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
            <h1 className="font-display text-2xl text-primary mb-2">ВОССТАНОВЛЕНИЕ</h1>
            <p className="text-muted-foreground">Подключаем вас к игре...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h1 className="font-display text-2xl text-green-500 mb-2">УСПЕШНО!</h1>
            <p className="text-muted-foreground">Вы восстановлены в игре. Перенаправляем...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h1 className="font-display text-2xl text-red-500 mb-2">ОШИБКА</h1>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            
            <div className="space-y-3">
              {gameId && (
                <button
                  onClick={() => navigate(`/join/${gameId}`)}
                  className="w-full px-4 py-3 bg-primary/20 border border-primary text-primary rounded-lg font-display hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Попробовать присоединиться
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-3 bg-muted text-muted-foreground rounded-lg font-display hover:bg-muted/80 transition-colors"
              >
                На главную
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default RecoveryPage;
