const isBrowser = typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const STORAGE_KEY = "ad-chat-cache";
const DEFAULT_TTL = 60 * 1000; // 60 seconds

const readStore = () => {
  if (!isBrowser) return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store) => {
  if (!isBrowser) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota exceeded errors
  }
};

export const getCacheItem = (key) => {
  const store = readStore();
  const entry = store[key];
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    delete store[key];
    writeStore(store);
    return null;
  }
  return entry.value;
};

export const setCacheItem = (key, value, ttl = DEFAULT_TTL) => {
  const store = readStore();
  store[key] = {
    value,
    expiresAt: Date.now() + ttl,
  };
  writeStore(store);
};

export const removeCacheItem = (key) => {
  const store = readStore();
  if (store[key]) {
    delete store[key];
    writeStore(store);
  }
};

export const clearCacheByPrefix = (prefix) => {
  const store = readStore();
  let mutated = false;
  Object.keys(store).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete store[key];
      mutated = true;
    }
  });
  if (mutated) {
    writeStore(store);
  }
};

export const CACHE_KEYS = {
  conversationList: (role, userId) => `conversations:${role}:${userId}`,
  conversation: (conversationId) => `conversation:${conversationId}`,
};
