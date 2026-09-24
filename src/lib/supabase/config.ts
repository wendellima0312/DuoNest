const fallbackUrl = "https://nmhleyytflwrcdrybash.supabase.co";
const fallbackPublishableKey = "sb_publishable_teAfXb3YrA8rgb2P-GIycw_cTscKtoz";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey;
