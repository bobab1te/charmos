/**
 * localStorage-backed draft persistence for in-progress modal/form state, so a full
 * component unmount — navigating to a different sidebar section, switching browser
 * tabs and back, or Radix unmounting an inactive Tabs panel — doesn't lose whatever
 * the user has typed. Drafts are only cleared on an explicit close (X, Cancel, or a
 * successful save/delete/archive), never as a side effect of unmounting.
 */

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function readDraft<T>(key: string): T | undefined {
  if (!isBrowser()) return undefined
  try {
    const stored = window.localStorage.getItem(key)
    return stored !== null ? (JSON.parse(stored) as T) : undefined
  } catch {
    return undefined
  }
}

export function writeDraft<T>(key: string, value: T): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // best-effort — e.g. storage quota exceeded or private-browsing restrictions
  }
}

export function clearDraft(key: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
