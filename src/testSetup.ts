const storageMap = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => { storageMap.set(key, value); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] || null
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = localStorageMock as unknown as Storage;
}

if (typeof window === 'undefined') {
  (globalThis as any).window = {
    location: { origin: 'http://localhost:5173', hash: '', search: '', host: 'localhost:5173' }
  };
}
