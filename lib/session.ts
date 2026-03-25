/**
 * Client-side session storage using sessionStorage.
 * Holds onboarding data, generated content, and selected images
 * throughout the multi-step builder flow.
 */

import type { SessionData } from "./schemas";

const SESSION_KEY = "kit-store-builder-session";

let listeners: Array<() => void> = [];

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getSession(): SessionData {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionData) : {};
  } catch {
    return {};
  }
}

export function setSession(partial: Partial<SessionData>) {
  if (typeof window === "undefined") return;
  const current = getSession();
  const merged = { ...current, ...partial };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  notify();
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  notify();
}

/** For useSyncExternalStore — returns a snapshot string */
export function getSessionSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

/** For useSyncExternalStore — subscribes to changes */
export function subscribeSession(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}
