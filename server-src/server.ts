import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 65505; // 8080と8081は使えないので65505番を使うのじゃ

// ---------- kakaku.com 価格推移プロキシ ----------

interface ChartEntry {
	date: string;
	aveprice: number;
	lowprice: number;
}

interface KakakuPriceData {
	productId: string;
	productName: string;
	currentPrice: number;
	chartData: ChartEntry[];
	fetchedAt: string;
}

interface CacheEntry {
	data: KakakuPriceData;
	cachedAt: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL_DAYS = 1;
const MIN_TTL_DAYS = 1;
const MAX_TTL_DAYS = 7;
const priceCache = new Map<string, CacheEntry>();

function clampTtlDays(raw: unknown): number {
	const n = Number(raw);
	if (!Number.isFinite(n)) return DEFAULT_TTL_DAYS;
	return Math.max(MIN_TTL_DAYS, Math.min(MAX_TTL_DAYS, Math.round(n)));
}

function extractChartData(html: string): ChartEntry[] {
	const match = html.match(/var\s+chartData\s*=\s*\[([\s\S]*?)\];/);
	if (!match?.[1]) return [];

	const entries: ChartEntry[] = [];
	const entryPattern = /\{\s*date\s*:\s*'([^']+)'\s*,\s*aveprice\s*:\s*(\d+)\s*,\s*lowprice\s*:\s*(\d+)\s*\}/g;
	let m: RegExpExecArray | null;
	while ((m = entryPattern.exec(match[1])) !== null) {
		const [, dateRaw, ave, low] = m;
		if (dateRaw && ave && low) {
			entries.push({
				date: dateRaw.replace(/\//g, '-'),
				aveprice: parseInt(ave, 10),
				lowprice: parseInt(low, 10),
			});
		}
	}
	return entries;
}

function extractCurrentPrice(html: string): number {
	const match = html.match(/difboxMinPrice[^>]*>(?:&yen;|\\?)([0-9,]+)/);
	if (!match?.[1]) return 0;
	return parseInt(match[1].replace(/,/g, ''), 10) || 0;
}

function extractProductName(html: string): string {
	const match = html.match(/<h1[^>]*>(?:<a[^>]*>)?\s*([\s\S]*?)(?:<\/a>)?\s*<\/h1>/i);
	if (!match?.[1]) return '';
	return match[1]
		.replace(/<[^>]+>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

async function fetchKakakuPrice(productId: string, ttlDays: number): Promise<KakakuPriceData> {
	const ttlMs = ttlDays * ONE_DAY_MS;
	const cached = priceCache.get(productId);
	if (cached && Date.now() - cached.cachedAt < ttlMs) {
		console.log(`[kakaku] cache hit: ${productId} (ttl=${String(ttlDays)}d)`);
		return cached.data;
	}

	const url = `https://kakaku.com/item/${encodeURIComponent(productId)}/pricehistory/`;
	console.log(`[kakaku] fetching: ${url}`);

	const res = await fetch(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
		},
	});
	if (!res.ok) {
		throw new Error(`kakaku.com returned ${String(res.status)}`);
	}

	const buf = Buffer.from(await res.arrayBuffer());
	const html = new TextDecoder('shift-jis').decode(buf);

	const chartData = extractChartData(html);
	if (chartData.length === 0) {
		throw new Error('No chart data found in page');
	}

	const lastEntry = chartData[chartData.length - 1];
	const currentPrice = extractCurrentPrice(html) || (lastEntry?.lowprice ?? 0);
	const productName = extractProductName(html)
		.replace(/の価格推移グラフ$/, '')
		.trim() || productId;

	const data: KakakuPriceData = {
		productId,
		productName,
		currentPrice,
		chartData,
		fetchedAt: new Date().toISOString(),
	};

	priceCache.set(productId, { data, cachedAt: Date.now() });
	console.log(`[kakaku] cached: ${productId} (entries=${String(chartData.length)})`);
	return data;
}

const PRODUCT_ID_PATTERN = /^K\d{10}$/;

app.get('/api/kakaku-price/:productId', (req: Request, res: Response) => {
	const { productId } = req.params;
	if (!productId || !PRODUCT_ID_PATTERN.test(productId)) {
		res.status(400).json({ error: 'Invalid product ID format' });
		return;
	}

	const ttlDays = clampTtlDays(req.query['ttl']);

	fetchKakakuPrice(productId, ttlDays)
		.then(data => {
			res.json(data);
		})
		.catch((err: unknown) => {
			const message = err instanceof Error ? err.message : 'Unknown error';
			console.error(`[kakaku] error for ${productId}:`, message);
			res.status(502).json({ error: message });
		});
});

// 静的ファイルを提供する
// 優先度: <project>/frontend-dist（必ずここを使う） > <dist> > <project root>
const candidates = [
	path.join(__dirname, '..', 'frontend-dist'), // 常にここを優先して配信する
	__dirname,                                   // dist
	path.join(__dirname, '..')                   // プロジェクトルート（開発時）
];
const rootDir = candidates.find(p => fs.existsSync(path.join(p, 'index.html')));
// 存在しない場合はフォールバックとしてプロジェクトルートを使う
const staticRoot = rootDir || path.join(__dirname, '..');
app.use(express.static(staticRoot));
// プロジェクト直下の js 資産も配信（Vite 出力配下に無い UMD 用など）
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
// ビルド済みフロントエンドのアセットを優先的に配信（開発時も `/assets/*` を解決できるようにする）
const builtAssetsDir = path.join(__dirname, '..', 'frontend-dist', 'assets');
if (fs.existsSync(builtAssetsDir)) {
	app.use('/assets', express.static(builtAssetsDir));
}

// ルートへのアクセス — 常に `frontend-dist/index.html` を返す（存在しなければ見つかった最初の index.html）
app.get('/', (_req, res) => {
	const prefer = path.join(__dirname, '..', 'frontend-dist', 'front-src','index.html');
	if (fs.existsSync(prefer)) {
		res.sendFile(prefer);
		return;
	}
	// frontend-dist/index.html が無ければ先に見つかった index.html を返す
	const fallbackIndex = path.join(staticRoot, 'index.html');
	res.sendFile(fallbackIndex);
});

// サーバー起動
app.listen(PORT, () => {
	console.log(`七瀬の魔法ツールボックスが http://localhost:${PORT}/ で動いておるぞい！`);
});


