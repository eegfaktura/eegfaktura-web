import '@testing-library/jest-dom/vitest'
import { setupIonicReact } from '@ionic/react';

setupIonicReact();

// Mock matchmedia
window.matchMedia = window.matchMedia || function() {
  return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
  };
};

// @ts-ignore
window.authConfig = {
  "authServerUrl": "https://login.ourproject.at/auth/",
  "clientSecret": "LxUXJLXP2Ra57y4RcIzXPYgNHvJF7H1j",
  "realm": "VFEEG",
  "clientId": "at.ourproject.vfeeg.app"
}