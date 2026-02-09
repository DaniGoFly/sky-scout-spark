/**
 * Supabase client — uses env variables only, no hardcoded values.
 * For most usage, prefer importing from @/integrations/supabase/client instead.
 */
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
