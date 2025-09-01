import { formatDateForUrl } from "./format-date";

const MAX_TILES = 5000; // or estimate based on IndexedDB size
const PURGE_THRESHOLD = 0.9; // start purging at 90% of max

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

    public purgeIfNeeded() {
        const allTiles: { category: string; dateKey: string; key: TileKey; lastUsed: number }[] = [];

        for (const [category, dateMap] of this.lastUsed) {
            for (const [dateKey, tileMap] of dateMap) {
                for (const [key, timestamp] of tileMap) {
                    allTiles.push({ category, dateKey, key, lastUsed: timestamp });
                }
            }
        }

        if (allTiles.length < MAX_TILES * PURGE_THRESHOLD) return;

        // Sort tiles by oldest access
        allTiles.sort((a, b) => a.lastUsed - b.lastUsed);

        // Remove oldest 10-20% (tune as needed)
        const toRemove = allTiles.slice(0, Math.floor(allTiles.length * 0.2));

        for (const { category, dateKey, key } of toRemove) {
            this.loadedTiles.get(category)?.get(dateKey)?.delete(key);
            this.lastUsed.get(category)?.get(dateKey)?.delete(key);
        }

        console.log(`Purged ${toRemove.length} tiles from cache`);
    }
}