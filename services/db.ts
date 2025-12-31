import { openDB, DBSchema } from 'idb';
import { BoardItemData } from '../types';

interface VisionBoardDB extends DBSchema {
  items: {
    key: string;
    value: BoardItemData;
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'vision-board-db';
const DB_VERSION = 1;

const dbPromise = openDB<VisionBoardDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('items')) {
      db.createObjectStore('items', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings');
    }
  },
});

export const dbService = {
  async getAllItems() {
    return (await dbPromise).getAll('items');
  },
  
  async saveItem(item: BoardItemData) {
    return (await dbPromise).put('items', item);
  },
  
  async deleteItem(id: string) {
    return (await dbPromise).delete('items', id);
  },
  
  async getSetting(key: string) {
    return (await dbPromise).get('settings', key);
  },
  
  async saveSetting(key: string, value: any) {
    return (await dbPromise).put('settings', value, key);
  },
  
  async clearBoard() {
    const db = await dbPromise;
    await db.clear('items');
    await db.delete('settings', 'bgImage');
    // We keep pan/scale settings generally, or clear them too? Let's clear bgImage but maybe keep basic prefs.
    // For "Start Fresh", let's clear bgImage.
  }
};