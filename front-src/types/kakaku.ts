export interface ChartEntry {
	readonly date: string;
	readonly aveprice: number;
	readonly lowprice: number;
}

export interface KakakuPriceData {
	readonly productId: string;
	readonly productName: string;
	readonly currentPrice: number;
	readonly chartData: readonly ChartEntry[];
	readonly fetchedAt: string;
}

export interface KakakuCacheEntry {
	readonly data: KakakuPriceData;
	readonly cachedAt: number;
}
