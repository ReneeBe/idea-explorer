import { useState } from 'react';

const SESSION_KEY = 'claude-api-key';

export function useSessionKey(): [string, (key: string) => void] {
  const [key, setKeyState] = useState(() => sessionStorage.getItem(SESSION_KEY) ?? '');
  const setKey = (k: string) => { sessionStorage.setItem(SESSION_KEY, k); setKeyState(k); };
  return [key, setKey];
}
