/**
 * Restricted-content acknowledgment lives in `sessionStorage`, so it is scoped
 * to one browser tab session. Admins can clear it to preview the notice again,
 * but there is no server-side record to reset for other visitors.
 */
const ACK_PREFIX = 'yuriorbit:restricted-ack:';

export function isRestrictedAcknowledged(titleId: string): boolean {
  try {
    return sessionStorage.getItem(ACK_PREFIX + titleId) === '1';
  } catch {
    return false;
  }
}

export function acknowledgeRestricted(titleId: string): void {
  try {
    sessionStorage.setItem(ACK_PREFIX + titleId, '1');
  } catch {
    /* Private mode or storage disabled: the gate will show again next visit. */
  }
}

export function clearRestrictedAcknowledgment(titleId: string): void {
  try {
    sessionStorage.removeItem(ACK_PREFIX + titleId);
  } catch {
    /* Nothing to clear when storage is unavailable. */
  }
}

/** Clears every acknowledgment in this browser; returns how many were removed. */
export function clearAllRestrictedAcknowledgments(): number {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(ACK_PREFIX)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
    return keys.length;
  } catch {
    return 0;
  }
}
