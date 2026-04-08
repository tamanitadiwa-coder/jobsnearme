/*
 * StoresNearm — AdSense Configuration
 * ====================================
 * 1. Replace YOUR_ADSENSE_PUBLISHER_ID  with your ca-pub-XXXXXXXXXXXXXXXX
 * 2. Replace YOUR_AD_SLOT_ID            with your Ad Unit slot ID
 * 3. Make sure your AdSense account is approved and the site is verified
 *
 * AdSense interstitial triggers every 3 store detail views.
 * The counter persists in localStorage and resets after each ad.
 */

window.SN_ADS = {
  publisherId: 'ca-pub-YOUR_PUBLISHER_ID_HERE',
  slotId:      'YOUR_AD_SLOT_ID_HERE',
  frequency:   3,        // show ad every N store views
  duration:    30,       // countdown seconds user must wait

  /* Returns true if an ad should show now */
  shouldShow: function () {
    const count = parseInt(localStorage.getItem('sn_view_count') || '0', 10);
    return count > 0 && count % this.frequency === 0;
  },

  /* Call every time a store detail page loads */
  increment: function () {
    const count = parseInt(localStorage.getItem('sn_view_count') || '0', 10);
    localStorage.setItem('sn_view_count', count + 1);
  },

  /* Reset counter (called after ad is dismissed) */
  reset: function () {
    localStorage.setItem('sn_view_count', '0');
  },

  /* Returns true if publisher ID has been configured */
  isConfigured: function () {
    return this.publisherId !== 'ca-pub-YOUR_PUBLISHER_ID_HERE';
  }
};
