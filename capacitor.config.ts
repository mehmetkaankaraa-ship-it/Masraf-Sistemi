import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.masrafledger.app',
  appName: 'Masraf Ledger',
  // Remote URL mode: uygulama Vercel'de çalışıyor, WebView sadece yükler
  server: {
    url: 'https://masraf-ledger.vercel.app',
    cleartext: false,
  },
  // webDir yine de gerekli — Capacitor CLI için boş bile olsa tanımlı olmalı
  webDir: 'out',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f172a',
    },
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
}

export default config
