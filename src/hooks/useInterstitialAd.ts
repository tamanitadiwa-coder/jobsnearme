import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

const ANDROID_ID = 'ca-app-pub-3940256099942544/1033173712'; // test
const IOS_ID     = 'ca-app-pub-3940256099942544/4411468910'; // test
const adUnitId   = Platform.OS === 'ios' ? IOS_ID : ANDROID_ID;

// ── Module-level singleton — lives for the lifetime of the JS bundle ────────
type ReadyListener = (ready: boolean) => void;

let _ad: InterstitialAd | null = null;
let _ready = false;
let _onClosed: (() => void) | null = null;
const _listeners = new Set<ReadyListener>();
let _unsub: Array<() => void> = [];
let _retryTimer: ReturnType<typeof setTimeout> | null = null;

function setReady(v: boolean) {
  _ready = v;
  _listeners.forEach(function(fn) { fn(v); });
}

function createAndLoad() {
  // Cancel any pending retry
  if (_retryTimer !== null) { clearTimeout(_retryTimer); _retryTimer = null; }

  // Tear down previous ad's listeners
  _unsub.forEach(function(fn) { fn(); });
  _unsub = [];
  setReady(false);

  const ad = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  _ad = ad;

  _unsub.push(
    ad.addAdEventListener(AdEventType.LOADED, function() {
      setReady(true);
    }),
    ad.addAdEventListener(AdEventType.CLOSED, function() {
      setReady(false);
      const cb = _onClosed;
      _onClosed = null;
      cb?.();
      createAndLoad(); // immediately preload the next
    }),
    ad.addAdEventListener(AdEventType.ERROR, function() {
      setReady(false);
      const cb = _onClosed;
      _onClosed = null;
      cb?.(); // silently dismiss modal if we were mid-show
      _retryTimer = setTimeout(createAndLoad, 5_000); // retry shortly
    }),
  );

  ad.load();
}

// Preload fires as soon as this module is first imported
createAndLoad();

// Called by _layout.tsx import — the import itself is the side effect
export function initInterstitialAd() {}

/**
 * Show the preloaded interstitial. If for any reason the ad is not ready,
 * onClosed is called immediately so the caller falls through to store content.
 */
export function showInterstitial(onClosed: () => void) {
  if (!_ready || !_ad) {
    onClosed();
    return;
  }
  _onClosed = onClosed;
  _ad.show();
}

// ── React hook — subscribes to ready state changes ─────────────────────────
export function useInterstitialAd() {
  const [isReady, setIsReady] = useState(_ready);

  useEffect(function() {
    _listeners.add(setIsReady);
    // Sync in case state changed between module load and hook mount
    setIsReady(_ready);
    return function() { _listeners.delete(setIsReady); };
  }, []);

  return { isReady, show: showInterstitial };
}
