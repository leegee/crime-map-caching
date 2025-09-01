import { formatDateForUrl } from "./format-date";

type TileKey = string;
type TileCoord = [number, number];

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

    constructor(opts: TileGridOptions) {
        this.opts = opts;
    }

    private tileKey(x: number, y: number): TileKey {
        return `${x}:${y}`;
    }

    markTileLoaded(category: string, dateKey: string, x: number, y: number) {
        if (!this.loadedTiles.has(category)) {
            this.loadedTiles.set(category, new Map());
        }
        const dateMap = this.loadedTiles.get(category)!;
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, new Set());
        }
        dateMap.get(dateKey)!.add(this.tileKey(x, y));
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
}