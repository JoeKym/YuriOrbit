import { supabase } from '@/lib/supabase';

export interface MaintenanceConfig {
  active: boolean;
  /** Short headline/message shown to visitors. */
  message?: string;
  /** Optional ETA string (free text or ISO-ish), displayed as-is. */
  eta?: string;
  /** When maintenance was enabled (ISO). */
  startedAt?: string;
  /** Admin email who last updated it. */
  updatedBy?: string;
}

export const DEFAULT_MAINTENANCE: MaintenanceConfig = {
  active: false,
  message: '',
  eta: '',
};

export async function fetchMaintenanceConfig(): Promise<MaintenanceConfig> {
  if (!supabase) return DEFAULT_MAINTENANCE;
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance')
      .maybeSingle();
    if (error || !data?.value || typeof data.value !== 'object') return DEFAULT_MAINTENANCE;
    const v = data.value as Partial<MaintenanceConfig>;
    return {
      active: Boolean(v.active),
      message: typeof v.message === 'string' ? v.message : '',
      eta: typeof v.eta === 'string' ? v.eta : '',
      startedAt: typeof v.startedAt === 'string' ? v.startedAt : undefined,
      updatedBy: typeof v.updatedBy === 'string' ? v.updatedBy : undefined,
    };
  } catch {
    return DEFAULT_MAINTENANCE;
  }
}
