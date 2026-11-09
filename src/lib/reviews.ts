import { supabase } from '@/lib/supabase';

export interface SiteReview {
  id: string;
  name: string;
  role?: string;
  quote: string;
  rating?: number; // 1-5
  featured?: boolean;
  approved?: boolean;
  sourceId?: string;
  createdAt?: string;
}

export async function fetchApprovedReviews(): Promise<SiteReview[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'reviews')
      .maybeSingle();
    if (error || !data?.value) return [];
    const raw = Array.isArray(data.value) ? (data.value as SiteReview[]) : [];
    return raw
      .filter((r) => r && r.approved && typeof r.quote === 'string' && r.quote.trim())
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
      .slice(0, 12);
  } catch {
    return [];
  }
}
