import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://amuwgjnwxeuiajzjdeza.supabase.co";
const supabaseKey = "sb_publishable_O7pQwn0dAIvscvLOTZ7b2g_OnwS1Nw5";

export const supabase = createClient(supabaseUrl, supabaseKey);