import { openDB } from "idb";
import type { TileKey } from "./tiles";

const DB_NAME = "tile-cache-db";
const STORE_NAME = "tiles";

export async function getDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
                store.createIndex("category", "category");
                store.createIndex("dateKey", "dateKey");
            }
        },
    });
}

export type TileRecord = {
    key: TileKey;
    category: string;
    dateKey: string;
    lastUsed: number;
};

export async function saveTileToDB(record: TileRecord) {
    const db = await getDB();
    await db.put(STORE_NAME, record);
}

export async function deleteTileFromDB(key: TileKey) {
    const db = await getDB();
    await db.delete(STORE_NAME, key);
}

export async function getAllTilesFromDB(): Promise<TileRecord[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
}
