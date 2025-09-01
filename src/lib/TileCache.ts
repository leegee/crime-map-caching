const BYTES_PER_TILE_EST = 8 * 1024; // bigger because storing GeoJSON
const USE_AVAILALBE_CACHE_FACTOR = 0.6;
const MAX_CACHE_BYTES = 50 * 1024 * 1024;

type TileKey = string;
export type TileCoord = [number, number];

interface TileGridOptions {
    minLon: number;
    minLat: number;
    tileWidth: number;
    tileHeight: number;
}

interface TileRecord {
    category: string;
    dateKey: string;
    key: TileKey;
    lastUsed: number;
    geojson: any;
}

export class TileCache {
    private loadedTiles: Map<string, Map<string, Set<TileKey>>> = new Map();
    private lastUsed: Map<string, Map<string, Map<TileKey, number>>> = new Map();
    private geojsonCache: Map<string, Map<string, Map<TileKey, any>>> = new Map();
    private opts: TileGridOptions;
    private db: IDBDatabase | null = null;

    constructor(opts: TileGridOptions) {
        this.opts = opts;
    }

    private tileKey(x: number, y: number) {
        return `${x}:${y}`;
    }

    private async openDb() {
        if (this.db) return this.db;
        return new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open("tileCacheDB", 2);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains("tiles")) {
                    db.createObjectStore("tiles", { keyPath: ["category", "dateKey", "key"] });
                }
            };
            req.onsuccess = () => {
                this.db = req.result;
                resolve(this.db);
            };
            req.onerror = () => reject(req.error);
        });
    }

    private async putTileRecord(record: TileRecord) {
        const db = await this.openDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction("tiles", "readwrite");
            tx.objectStore("tiles").put(record);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    private async loadAllTileRecords(): Promise<TileRecord[]> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("tiles", "readonly");
            const store = tx.objectStore("tiles");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result as TileRecord[]);
            req.onerror = () => reject(req.error);
        });
    }

    async initFromDb() {
        const records = await this.loadAllTileRecords();
        for (const { category, dateKey, key, lastUsed, geojson } of records) {
            if (!this.loadedTiles.has(category)) this.loadedTiles.set(category, new Map());
            if (!this.lastUsed.has(category)) this.lastUsed.set(category, new Map());
            if (!this.geojsonCache.has(category)) this.geojsonCache.set(category, new Map());

            const dateMap = this.loadedTiles.get(category)!;
            const lastUsedDateMap = this.lastUsed.get(category)!;
            const geojsonDateMap = this.geojsonCache.get(category)!;

            if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Set());
            if (!lastUsedDateMap.has(dateKey)) lastUsedDateMap.set(dateKey, new Map());
            if (!geojsonDateMap.has(dateKey)) geojsonDateMap.set(dateKey, new Map());

            dateMap.get(dateKey)!.add(key);
            lastUsedDateMap.get(dateKey)!.set(key, lastUsed);
            geojsonDateMap.get(dateKey)!.set(key, geojson);
        }
        console.log(`TileCache: loaded ${records.length} tiles from IndexedDB`);
    }

    async markTileLoaded(category: string, dateKey: string, x: number, y: number, geojson: any) {
        const key = this.tileKey(x, y);

        if (!this.loadedTiles.has(category)) this.loadedTiles.set(category, new Map());
        if (!this.lastUsed.has(category)) this.lastUsed.set(category, new Map());
        if (!this.geojsonCache.has(category)) this.geojsonCache.set(category, new Map());

        const dateMap = this.loadedTiles.get(category)!;
        const lastUsedDateMap = this.lastUsed.get(category)!;
        const geojsonDateMap = this.geojsonCache.get(category)!;

        if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Set());
        if (!lastUsedDateMap.has(dateKey)) lastUsedDateMap.set(dateKey, new Map());
        if (!geojsonDateMap.has(dateKey)) geojsonDateMap.set(dateKey, new Map());

        dateMap.get(dateKey)!.add(key);
        lastUsedDateMap.get(dateKey)!.set(key, Date.now());
        geojsonDateMap.get(dateKey)!.set(key, geojson);

        await this.putTileRecord({
            category,
            dateKey,
            key,
            lastUsed: Date.now(),
            geojson,
        });
    }

    getTileGeoJSON(category: string, dateKey: string, x: number, y: number): any | undefined {
        return this.geojsonCache.get(category)?.get(dateKey)?.get(this.tileKey(x, y));
    }

    isTileLoaded(category: string, dateKey: string, x: number, y: number): boolean {
        return this.loadedTiles.get(category)?.get(dateKey)?.has(this.tileKey(x, y)) ?? false;
    }

    updateLruTimestamp(category: string, dateKey: string, x: number, y: number) {
        const key = this.tileKey(x, y);
        this.lastUsed.get(category)?.get(dateKey)?.set(key, Date.now());
    }

    async deleteTile(category: string, dateKey: string, key: TileKey) {
        this.loadedTiles.get(category)?.get(dateKey)?.delete(key);
        this.lastUsed.get(category)?.get(dateKey)?.delete(key);
        this.geojsonCache.get(category)?.get(dateKey)?.delete(key);

        if (this.loadedTiles.get(category)?.get(dateKey)?.size === 0) this.loadedTiles.get(category)?.delete(dateKey);
        if (this.lastUsed.get(category)?.get(dateKey)?.size === 0) this.lastUsed.get(category)?.delete(dateKey);
        if (this.geojsonCache.get(category)?.get(dateKey)?.size === 0) this.geojsonCache.get(category)?.delete(dateKey);

        const db = await this.openDb();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction("tiles", "readwrite");
            tx.objectStore("tiles").delete([category, dateKey, key]);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async purgeIfNeeded() {
        const available = await this.getAvailableQuota();
        const tilesFlat: { category: string; dateKey: string; key: TileKey; lastUsed: number }[] = [];

        for (const [category, dateMap] of this.lastUsed) {
            for (const [dateKey, tileMap] of dateMap) {
                for (const [key, timestamp] of tileMap) {
                    tilesFlat.push({ category, dateKey, key, lastUsed: timestamp });
                }
            }
        }

        const estimatedCacheBytes = tilesFlat.length * BYTES_PER_TILE_EST;
        if (estimatedCacheBytes < available * 0.9) return;

        tilesFlat.sort((a, b) => a.lastUsed - b.lastUsed);

        let freedBytes = 0;
        const targetBytes = available * USE_AVAILALBE_CACHE_FACTOR;
        for (const { category, dateKey, key } of tilesFlat) {
            if (freedBytes + BYTES_PER_TILE_EST > estimatedCacheBytes - targetBytes) break;
            await this.deleteTile(category, dateKey, key);
            freedBytes += BYTES_PER_TILE_EST;
        }

        console.log(`Purged ${Math.floor(freedBytes / BYTES_PER_TILE_EST)} tiles to stay under quota`);
    }

    private async getAvailableQuota(): Promise<number> {
        if (navigator.storage?.estimate) {
            try {
                const { quota, usage } = await navigator.storage.estimate();
                return quota! - usage!;
            } catch { }
        }
        return MAX_CACHE_BYTES;
    }

    private lonToTileX(lon: number): number {
        return Math.floor((lon - this.opts.minLon) / this.opts.tileWidth);
    }
    private latToTileY(lat: number): number {
        return Math.floor((lat - this.opts.minLat) / this.opts.tileHeight);
    }

    getTilesInBBox(minLon: number, minLat: number, maxLon: number, maxLat: number): TileCoord[] {
        const startX = this.lonToTileX(minLon);
        const endX = this.lonToTileX(maxLon);
        const startY = this.latToTileY(minLat);
        const endY = this.latToTileY(maxLat);

        const tiles: TileCoord[] = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                tiles.push([x, y]);
            }
        }
        return tiles;
    }

    getTilesToFetchWithLruUpdate(category: string, dateKey: string, tiles: TileCoord[]): TileCoord[] {
        const tilesToFetch: TileCoord[] = [];
        for (const [x, y] of tiles) {
            if (this.isTileLoaded(category, dateKey, x, y)) {
                this.updateLruTimestamp(category, dateKey, x, y);
            } else {
                tilesToFetch.push([x, y]);
            }
        }
        return tilesToFetch;
    }

    tileToBBox(x: number, y: number) {
        return {
            minLon: this.opts.minLon + x * this.opts.tileWidth,
            minLat: this.opts.minLat + y * this.opts.tileHeight,
            maxLon: this.opts.minLon + (x + 1) * this.opts.tileWidth,
            maxLat: this.opts.minLat + (y + 1) * this.opts.tileHeight,
        };
    }
}
