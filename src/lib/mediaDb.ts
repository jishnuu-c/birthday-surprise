// IndexedDB Media Storage for safe handling of local audio & video files
// Prevents QuotaExceededError in localStorage when storing user-uploaded media files

const DB_NAME = 'BirthdayMagicMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

export interface MediaRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

const blobUrlCache = new Map<string, string>();

/**
 * Save a media Blob / File to IndexedDB and return an object URL for playback
 */
export async function saveMediaBlob(
  id: string,
  file: Blob | File,
  filename?: string
): Promise<{ blobUrl: string; size: number; name: string; type: string }> {
  const db = await getDb();
  const name = filename || (file instanceof File ? file.name : 'media_file');
  const type = file.type || 'application/octet-stream';
  const size = file.size;

  const record: MediaRecord = {
    id,
    name,
    type,
    size,
    blob: file,
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => {
      // Revoke old blob url if exists
      if (blobUrlCache.has(id)) {
        try {
          URL.revokeObjectURL(blobUrlCache.get(id)!);
        } catch {
          // ignore
        }
      }
      const url = URL.createObjectURL(file);
      blobUrlCache.set(id, url);
      resolve({ blobUrl: url, size, name, type });
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve a media Blob from IndexedDB and return an object URL
 */
export async function getMediaBlobUrl(id: string): Promise<string | null> {
  if (blobUrlCache.has(id)) {
    return blobUrlCache.get(id)!;
  }

  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as MediaRecord | undefined;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          blobUrlCache.set(id, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Get media file metadata
 */
export async function getMediaRecord(id: string): Promise<MediaRecord | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Delete a media file from IndexedDB
 */
export async function deleteMediaBlob(id: string): Promise<void> {
  if (blobUrlCache.has(id)) {
    try {
      URL.revokeObjectURL(blobUrlCache.get(id)!);
    } catch {
      // ignore
    }
    blobUrlCache.delete(id);
  }

  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}
