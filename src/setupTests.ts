import '@testing-library/jest-dom/vitest'

// pure function tests run with `// @vitest-environment node` (WEB-CQ-26): no DOM, so no Ionic and date-picker setup
if (typeof window !== "undefined") {
  const {setupIonicReact} = await import('@ionic/react');
  const {registerDatePickerLocale} = await import('./util/DateFormat.util');

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
}
