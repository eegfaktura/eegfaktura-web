import '@testing-library/jest-dom/vitest'
import { setupIonicReact } from '@ionic/react';
import {registerDatePickerLocale} from './util/DateFormat.util';

setupIonicReact();

// as in main.tsx: German date pickers
registerDatePickerLocale();

// Mock matchmedia
window.matchMedia = window.matchMedia || function() {
  return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
  };
};
