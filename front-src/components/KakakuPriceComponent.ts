import { Chart, registerables } from 'chart.js';
import type { KakakuPriceData, KakakuCacheEntry } from '../types/kakaku.ts';

Chart.register(...registerables);

const PRIMARY_PRODUCT_ID = 'K0001521544';
const FALLBACK_IDS: readonly string[] = [
	'K0001573623',
	'K0001521549',
	'K0001582710',
	'K0001582702',
	'K0001659804',
];

const CACHE_KEY_PREFIX = 'kakaku_price_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readLocalCache(productId: string): KakakuPriceData | null {
	try {
		const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${productId}`);
		if (!raw) return null;
		const entry: KakakuCacheEntry = JSON.parse(raw) as KakakuCacheEntry;
		if (Date.now() - entry.cachedAt < CACHE_TTL_MS) {
			return entry.data;
		}
		localStorage.removeItem(`${CACHE_KEY_PREFIX}${productId}`);
	} catch {
		/* corrupt cache */
	}
	return null;
}

function writeLocalCache(productId: string, data: KakakuPriceData): void {
	try {
		const entry: KakakuCacheEntry = { data, cachedAt: Date.now() };
		localStorage.setItem(`${CACHE_KEY_PREFIX}${productId}`, JSON.stringify(entry));
	} catch {
		/* quota exceeded */
	}
}

export class KakakuPriceComponent {
	private chart: Chart | null = null;
	private canvas!: HTMLCanvasElement;
	private statusEl!: HTMLElement;
	private productNameEl!: HTMLElement;
	private currentPriceEl!: HTMLElement;
	private refreshBtn!: HTMLButtonElement;
	private fetchedAtEl!: HTMLElement;

	public init(): void {
		this.canvas = document.getElementById('kakaku-chart') as HTMLCanvasElement;
		this.statusEl = document.getElementById('kakaku-status') as HTMLElement;
		this.productNameEl = document.getElementById('kakaku-product-name') as HTMLElement;
		this.currentPriceEl = document.getElementById('kakaku-current-price') as HTMLElement;
		this.refreshBtn = document.getElementById('kakaku-refresh') as HTMLButtonElement;
		this.fetchedAtEl = document.getElementById('kakaku-fetched-at') as HTMLElement;

		this.refreshBtn.addEventListener('click', () => {
			void this.loadWithFallback(true);
		});

		void this.loadWithFallback(false);
	}

	private async loadWithFallback(forceRefresh: boolean): Promise<void> {
		this.setStatus('読み込み中...', 'loading');
		this.refreshBtn.disabled = true;

		const idsToTry = [PRIMARY_PRODUCT_ID, ...FALLBACK_IDS];

		for (const productId of idsToTry) {
			try {
				const data = await this.fetchData(productId, forceRefresh);
				if (data.chartData.length === 0) {
					throw new Error('Empty chart data');
				}
				this.renderChart(data);
				this.setStatus('', 'ok');
				this.refreshBtn.disabled = false;
				return;
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : 'Unknown error';
				console.warn(`[kakaku] ${productId} failed: ${msg}`);
			}
		}

		this.setStatus('すべての商品IDでデータ取得に失敗しました', 'error');
		this.refreshBtn.disabled = false;
	}

	private async fetchData(productId: string, forceRefresh: boolean): Promise<KakakuPriceData> {
		if (!forceRefresh) {
			const cached = readLocalCache(productId);
			if (cached) {
				console.log(`[kakaku] localStorage cache hit: ${productId}`);
				return cached;
			}
		}

		const res = await fetch(`/api/kakaku-price/${encodeURIComponent(productId)}`);
		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			throw new Error(typeof body['error'] === 'string' ? body['error'] : `HTTP ${String(res.status)}`);
		}

		const data = (await res.json()) as KakakuPriceData;
		writeLocalCache(productId, data);
		return data;
	}

	private renderChart(data: KakakuPriceData): void {
		this.productNameEl.textContent = data.productName;
		this.currentPriceEl.textContent = `現在の最安値: ¥${data.currentPrice.toLocaleString('ja-JP')}`;

		const fetchedDate = new Date(data.fetchedAt);
		this.fetchedAtEl.textContent = `取得日時: ${fetchedDate.toLocaleString('ja-JP')}`;

		const entries = [...data.chartData].sort((a, b) => a.date.localeCompare(b.date));
		const labels = entries.map(e => e.date);
		const lowPrices = entries.map(e => e.lowprice);
		const avgPrices = entries.map(e => e.aveprice);

		if (this.chart) {
			this.chart.destroy();
			this.chart = null;
		}

		this.chart = new Chart(this.canvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: '最安価格 (¥)',
						data: lowPrices,
						borderColor: '#4a90d9',
						backgroundColor: 'rgba(74, 144, 217, 0.08)',
						fill: true,
						tension: 0.2,
						pointRadius: 0,
						pointHoverRadius: 5,
						borderWidth: 2,
					},
					{
						label: '平均価格 (¥)',
						data: avgPrices,
						borderColor: '#e8925a',
						backgroundColor: 'rgba(232, 146, 90, 0.08)',
						fill: false,
						tension: 0.2,
						pointRadius: 0,
						pointHoverRadius: 5,
						borderWidth: 1.5,
						borderDash: [4, 4],
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false,
				},
				plugins: {
					legend: { display: true, position: 'top' },
					tooltip: {
						callbacks: {
							label(ctx) {
								const val = ctx.parsed.y ?? 0;
								return `${ctx.dataset.label ?? ''}: ¥${val.toLocaleString('ja-JP')}`;
							},
						},
					},
				},
				scales: {
					x: {
						ticks: {
							maxRotation: 45,
							autoSkip: true,
							maxTicksLimit: 12,
						},
					},
					y: {
						ticks: {
							callback(value) {
								return `¥${Number(value).toLocaleString('ja-JP')}`;
							},
						},
					},
				},
			},
		});
	}

	private setStatus(message: string, type: 'loading' | 'error' | 'ok'): void {
		this.statusEl.textContent = message;
		this.statusEl.className = 'kakaku-status';
		if (type !== 'ok') {
			this.statusEl.classList.add(`kakaku-status--${type}`);
		}
	}
}
