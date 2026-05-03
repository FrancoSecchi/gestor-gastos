const KEY = 'presentation_mode';

export function isPresentationMode(): boolean {
  return localStorage.getItem(KEY) === 'true';
}

export function setPresentationMode(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(KEY, 'true');
  } else {
    localStorage.removeItem(KEY);
  }
}
