type TileKey = string;
type TileCoord = [number, number];

interface TileGridOptions {
    minLon: number;
    minLat: number;
    tileWidth: number;   // set to max server request width
    tileHeight: number;  // set to max server request height
}

export class TileCache {
    private loadedTiles = new Set<TileKey>();
    private opts: TileGridOptions;

    constructor(opts: TileGridOptions) {
        this.opts = opts;
    }

    private tileKey(x: number, y: number) {
        return `${x}:${y}`;
    }

    markTileLoaded(x: number, y: number) {
        this.loadedTiles.add(this.tileKey(x, y));
    }

    isTileLoaded(x: number, y: number) {
        return this.loadedTiles.has(this.tileKey(x, y));
    }

    // Convert lon/lat to tile coordinates
    private lonToTileX(lon: number) {
        return Math.floor((lon - this.opts.minLon) / this.opts.tileWidth);
    }
    private latToTileY(lat: number) {
        return Math.floor((lat - this.opts.minLat) / this.opts.tileHeight);
    }

    // Determine which tiles need fetching for a given bounding box
    getTilesToFetch(minLon: number, minLat: number, maxLon: number, maxLat: number): TileCoord[] {
        const startX = this.lonToTileX(minLon);
        const endX = this.lonToTileX(maxLon);
        const startY = this.latToTileY(minLat);
        const endY = this.latToTileY(maxLat);

        const tiles: TileCoord[] = [];
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (!this.isTileLoaded(x, y)) {
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
