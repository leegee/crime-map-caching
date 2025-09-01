import { formatDateForUrl } from "./format-date";

const BYTES_PER_TILE_EST = 1024;
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


export class TileCache {
    // nested cache: category -> dateKey -> Set<TileKey>
    private loadedTiles: Map<string, Map<string, Set<TileKey>>> = new Map();
    private opts: TileGridOptions;
    private lastUsed: Map<string, Map<string, Map<TileKey, number>>> = new Map();

    constructor(opts: TileGridOptions) {
        this.opts = opts;
    }

    private tileKey(x: number, y: number): TileKey {
        return `${x}:${y}`;
    }

    private async getAvailableQuota(): Promise<number> {
        if (navigator.storage?.estimate) {
            try {
                const { quota, usage } = await navigator.storage.estimate();
                return quota! - usage!;
            } catch {
                console.warn("Falling back to static MAX_CACHE_BYTES,", MAX_CACHE_BYTES);
                return MAX_CACHE_BYTES;
            }
        }
        console.warn("Falling back to static MAX_CACHE_BYTES,", MAX_CACHE_BYTES);
        return MAX_CACHE_BYTES;
    }

    markTileLoaded(category: string, dateKey: string, x: number, y: number) {
        if (!this.loadedTiles.has(category)) this.loadedTiles.set(category, new Map());
        const dateMap = this.loadedTiles.get(category)!;
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, new Set());
        const key = this.tileKey(x, y);
        dateMap.get(dateKey)!.add(key);

        // Update last use timestamp
        if (!this.lastUsed.has(category)) this.lastUsed.set(category, new Map());
        const lastUsedDateMap = this.lastUsed.get(category)!;
        if (!lastUsedDateMap.has(dateKey)) lastUsedDateMap.set(dateKey, new Map());
        lastUsedDateMap.get(dateKey)!.set(key, Date.now());
    }

    updateLruTimestamp(category: string, dateKey: string, x: number, y: number) {
        const key = this.tileKey(x, y);
        this.lastUsed.get(category)?.get(dateKey)?.set(key, Date.now());
    }

    isTileLoaded(category: string, dateKey: string, x: number, y: number): boolean {
        return (
            this.loadedTiles.get(category)?.get(dateKey)?.has(this.tileKey(x, y)) ??
            false
        );
    }

    private lonToTileX(lon: number): number {
        return Math.floor((lon - this.opts.minLon) / this.opts.tileWidth);
    }
    private latToTileY(lat: number): number {
        return Math.floor((lat - this.opts.minLat) / this.opts.tileHeight);
    }

    getTilesToFetch(
        category: string,
        date: Date,
        minLon: number,
        minLat: number,
        maxLon: number,
        maxLat: number
    ): TileCoord[] {
        const dateKey = formatDateForUrl(date);

        const startX = this.lonToTileX(minLon);
        const endX = this.lonToTileX(maxLon);
        const startY = this.latToTileY(minLat);
        const endY = this.latToTileY(maxLat);

        const tiles: TileCoord[] = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (!this.isTileLoaded(category, dateKey, x, y)) {
                    tiles.push([x, y]);
                }
            }
        }
        return tiles;
    }

    tileToBBox(x: number, y: number) {
        return {
            minLon: this.opts.minLon + x * this.opts.tileWidth,
            minLat: this.opts.minLat + y * this.opts.tileHeight,
            maxLon: this.opts.minLon + (x + 1) * this.opts.tileWidth,
            maxLat: this.opts.minLat + (y + 1) * this.opts.tileHeight,
        };
    }

    public getTilesInBBox(
        minLon: number,
        minLat: number,
        maxLon: number,
        maxLat: number
    ): TileCoord[] {
        const startX = Math.floor((minLon - this.opts.minLon) / this.opts.tileWidth);
        const endX = Math.floor((maxLon - this.opts.minLon) / this.opts.tileWidth);
        const startY = Math.floor((minLat - this.opts.minLat) / this.opts.tileHeight);
        const endY = Math.floor((maxLat - this.opts.minLat) / this.opts.tileHeight);

        const tiles: TileCoord[] = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                tiles.push([x, y]);
            }
        }
        return tiles;
    }

    public getTilesToFetchWithLruUpdate(
        category: string,
        dateKey: string,
        tiles: TileCoord[]
    ): TileCoord[] {
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

    // LRU purge
    public async purgeIfNeeded() {
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

        // Sort oldest first
        tilesFlat.sort((a, b) => a.lastUsed - b.lastUsed);

        // Remove tiles until under n% of available quota
        let freedBytes = 0;
        const targetBytes = available * USE_AVAILALBE_CACHE_FACTOR;
        for (const { category, dateKey, key } of tilesFlat) {
            if (freedBytes + BYTES_PER_TILE_EST > estimatedCacheBytes - targetBytes) break;

            this.loadedTiles.get(category)?.get(dateKey)?.delete(key);
            this.lastUsed.get(category)?.get(dateKey)?.delete(key);
            freedBytes += BYTES_PER_TILE_EST;
        }

        console.log(`Purged ${Math.floor(freedBytes / BYTES_PER_TILE_EST)} tiles to stay under quota`);
    }
}