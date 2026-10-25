import '@testing-library/jest-dom';

// In-memory indexedDB shim for JSDOM test environment
if (typeof window !== 'undefined' && !window.indexedDB) {
  (window as any).indexedDB = {
    open: () => ({
      result: {},
      addEventListener: () => {},
      onupgradeneeded: () => {},
      onsuccess: () => {},
      onerror: () => {},
    }),
  };
}
