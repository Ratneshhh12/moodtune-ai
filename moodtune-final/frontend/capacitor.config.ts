import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moodtune.app',
  appName: 'MoodTune',
  webDir: 'build',
  server: {
    // To enable live-reload on your mobile phone or emulator during development:
    // 1. Find your computer's local IP address (e.g. 192.168.1.XX)
    // 2. Uncomment the line below and change the IP to your computer's IP:
    // url: 'http://192.168.1.30:3000',
    cleartext: true
  }
};

export default config;
