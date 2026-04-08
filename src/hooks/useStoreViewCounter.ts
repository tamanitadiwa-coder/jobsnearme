import { useRef } from 'react';

// Module-level counter — session-scoped (resets on app restart)
let _sessionCount = 0;

export function useStoreViewCounter() {
  const adFlagRef = useRef(false);

  function incrementCount() {
    _sessionCount += 1;
    adFlagRef.current = _sessionCount % 3 === 0;
  }

  function resetAdFlag() {
    adFlagRef.current = false;
  }

  return {
    incrementCount,
    get shouldShowAd() { return adFlagRef.current; },
    resetAdFlag,
  };
}
