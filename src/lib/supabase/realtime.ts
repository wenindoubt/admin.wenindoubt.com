"use client";

import { useSession } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useMemo, useRef } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Returns a stable Supabase client authenticated with the current Clerk session token.
 * The client is created once; the accessToken callback reads from a ref so token
 * refreshes don't trigger client/channel recreation.
 */
export function useSupabase(): SupabaseClient {
  const { session } = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  return useMemo(
    () =>
      createClient(supabaseUrl, supabaseAnonKey, {
        async accessToken() {
          // Ref ensures latest token without recreating the client
          return sessionRef.current?.getToken() ?? null;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally stable: accessToken reads from ref
    [],
  );
}
