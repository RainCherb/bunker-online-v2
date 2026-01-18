import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

/**
 * Hook for managing anonymous authentication.
 * Uses Supabase Anonymous Auth to create cryptographically secure sessions.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          console.log('[Auth] Existing session found:', session.user.id);
        }
      } catch (error) {
        console.error('[Auth] Error checking session:', error);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] Auth state changed:', event);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in anonymously
  const signInAnonymously = useCallback(async (): Promise<User | null> => {
    try {
      console.log('[Auth] Signing in anonymously...');
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('[Auth] Anonymous sign-in error:', error);
        return null;
      }
      
      if (data.user) {
        console.log('[Auth] Anonymous sign-in successful:', data.user.id);
        setUser(data.user);
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('[Auth] Anonymous sign-in exception:', error);
      return null;
    }
  }, []);

  // Ensure user is authenticated (sign in anonymously if not)
  const ensureAuthenticated = useCallback(async (): Promise<User | null> => {
    if (user) {
      return user;
    }
    
    // Try to get existing session first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      return session.user;
    }
    
    // No session, sign in anonymously
    return signInAnonymously();
  }, [user, signInAnonymously]);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return {
    user,
    userId: user?.id ?? null,
    isLoading,
    isInitialized,
    signInAnonymously,
    ensureAuthenticated,
    signOut,
  };
}
