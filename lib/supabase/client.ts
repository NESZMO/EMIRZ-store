import { createBrowserClient } from "@supabase/ssr";

// Not parameterized with our hand-written Database type: this supabase-js
// version's generic Row/Insert/Update inference collapses to `never` across
// every table with a hand-rolled (non-CLI-generated) Database type here,
// even after adding the internal PostgrestVersion marker it expects. Reads
// are still fully typed via explicit casts to our own Row interfaces
// (lib/database.types.ts) at each call site.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
