'use client';
// Generic Supabase Realtime subscription hook (Postgres changes on a table).
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export function useRealtime(
  table: string,
  onChange: (payload: unknown) => void,
  event: ChangeEvent = '*',
): void {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on('postgres_changes', { event, schema: 'public', table }, onChange)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event]);
}
