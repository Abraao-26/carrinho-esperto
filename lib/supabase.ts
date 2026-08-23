// lib/supabase.ts
// Este arquivo cria a "ponte" de conexão entre o site e o banco de dados Supabase.
// Qualquer tela que precisar buscar mercados ou produtos vai importar este arquivo.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente único, reutilizado em todo o site
export const supabase = createClient(supabaseUrl, supabaseAnonKey);