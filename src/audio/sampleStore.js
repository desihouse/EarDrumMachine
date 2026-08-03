// IndexedDB storage for uploaded custom audio samples

const DB_NAME = 'BeatForgeSampleStore';
const DB_VERSION = 1;
const STORE_NAME = 'samples';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

export async function saveCustomSample(trackId, arrayBuffer, fileName, fileType) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        arrayBuffer,
        fileName,
        fileType,
        timestamp: Date.now()
      };
      const req = store.put(record, trackId);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error('Failed to save custom sample to IndexedDB:', err);
    return false;
  }
}

export async function loadCustomSample(trackId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error('Failed to load sample from IndexedDB:', err);
    return null;
  }
}

export async function clearCustomSample(trackId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(trackId);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error('Failed to delete sample from IndexedDB:', err);
    return false;
  }
}
