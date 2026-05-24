import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase-клиент для серверных компонентов / Server Actions / Route Handlers.
 * Привязан к cookies запроса для работы с сессией Supabase Auth.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Вызов из Server Component — запись cookies невозможна.
            // Сессию обновит middleware, поэтому ошибку можно игнорировать.
          }
        },
      },
    },
  );
}

/**
 * Admin-клиент с service_role ключом. ТОЛЬКО для серверного кода
 * (Telegram webhooks, фоновые задачи). Обходит RLS — никогда не использовать на клиенте.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
