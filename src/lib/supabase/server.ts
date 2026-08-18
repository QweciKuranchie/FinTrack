import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  try {
    const cookieStore = cookies();
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          try {
            return cookieStore.getAll();
          } catch {
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called during build or server component
          }
        },
      },
    });
  } catch {
    // Fallback for build time execution when cookies() is unavailable
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    });
  }
}
