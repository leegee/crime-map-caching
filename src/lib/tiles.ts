type TileKey = string;
type TileCoord = [number, number];

interface TileGridOptions {
    minLon: number;
    minLat: number;
    tileWidth: number;
    tileHeight: number;
}

export class TileCache {
    // nested cache: category -> date -> Set<TileKey>
    private loadedTiles: Map<string, Map<Date, Set<TileKey>>> = new Map();
    private opts: TileGridOptions;

    constructor(opts: TileGridOptions) {
        this.opts = opts;
    }

    private tileKey(x: number, y: number) {
        return `${x}:${y}`;
    }

    markTileLoaded(category: string, date: Date, x: number, y: number) {
        if (!this.loadedTiles.has(category)) {
            this.loadedTiles.set(category, new Map());
        }
        const dateMap = this.loadedTiles.get(category)!;
        if (!dateMap.has(date)) {
            dateMap.set(date, new Set());
        }
        dateMap.get(date)!.add(this.tileKey(x, y));
    }

    isTileLoaded(category: string, date: Date, x: number, y: number) {
        return this.loadedTiles.get(category)?.get(date)?.has(this.tileKey(x, y)) ?? false;
    }

    // Convert lon/lat to tile coordinates
    private lonToTileX(lon: number) {
        return Math.floor((lon - this.opts.minLon) / this.opts.tileWidth);
    }
    private latToTileY(lat: number) {
        return Math.floor((lat - this.opts.minLat) / this.opts.tileHeight);
    }

    // Determine which tiles need fetching for a given bounding box, category, and date
    getTilesToFetch(
        category: string,
        date: Date,
        minLon: number,
        minLat: number,
        maxLon: number,
        maxLat: number
    ): TileCoord[] {
        const startX = this.lonToTileX(minLon);
        const endX = this.lonToTileX(maxLon);
        const startY = this.latToTileY(minLat);
        const endY = this.latToTileY(maxLat);

        const tiles: TileCoord[] = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (!this.isTileLoaded(category, date, x, y)) {
                    tiles.push([x, y]);
                }
            }
        }
        return tiles;
    }

    // Convert tile coordinates back to bounding box
    tileToBBox(x: number, y: number) {
        return {
            minLon: this.opts.minLon + x * this.opts.tileWidth,
            minLat: this.opts.minLat + y * this.opts.tileHeight,
            maxLon: this.opts.minLon + (x + 1) * this.opts.tileWidth,
            maxLat: this.opts.minLat + (y + 1) * this.opts.tileHeight,
        };
    }
}
