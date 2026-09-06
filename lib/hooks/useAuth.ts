import { useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/authStore';

export function useAuthListener() {
  const { setSession, refreshProfile } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) refreshProfile();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) refreshProfile();
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}

export function useSession() {
  return useAuthStore((s) => s.session);
}

export function useUser() {
  return useAuthStore((s) => s.user);
}

export function useProfile() {
  return useAuthStore((s) => s.profile);
}
