import type { IntentType } from './intentConsent';

const KEY = 'xagent_consent_v1';

type ConsentMap = Record<IntentType, boolean>;

function read(): ConsentMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConsentMap) : {} as ConsentMap;
  } catch {
    return {} as ConsentMap;
  }
}

function write(map: ConsentMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export function hasConsent(intent: IntentType): boolean {
  const map = read();
  return !!map[intent];
}

export function setConsent(intent: IntentType, value: boolean): void {
  const map = read();
  map[intent] = value;
  write(map);
}




