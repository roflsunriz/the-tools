type Fiat = 'JPY' | 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'CNY' | 'KRW';
type Crypto = 'BTC' | 'ETH' | 'XRP' | 'DOGE' | 'SOL' | 'ADA' | 'DOT';

type ExchangeApiResponse = { rates: Record<string, number> };
type CoinGeckoIds = 'bitcoin' | 'ethereum' | 'ripple' | 'dogecoin' | 'solana' | 'cardano' | 'polkadot';
type CoinGeckoResponse = Partial<Record<CoinGeckoIds, { usd: number }>>;

export class ExchangeComponent {
	private timeDisplay!: HTMLElement;
	private container!: HTMLElement;
	private fiatCurrencies: Fiat[];
	private cryptoCurrencies: Crypto[];
	private exchangeRateBaseUrl: string;
	private cryptoBaseUrl: string;
	private currencyNames: Record<Fiat | Crypto, string>;

	constructor() {
		this.timeDisplay = document.getElementById('time-display') as HTMLElement;
		this.container = document.getElementById('grid-container') as HTMLElement;
		this.fiatCurrencies = ['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CNY', 'KRW'];
		this.cryptoCurrencies = ['BTC', 'ETH', 'XRP', 'DOGE', 'SOL', 'ADA', 'DOT'];
		this.exchangeRateBaseUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
		this.cryptoBaseUrl = 'https://api.coingecko.com/api/v3/simple/price';
		this.currencyNames = {
			JPY: '日本円',
			USD: 'アメリカドル',
			EUR: 'ユーロ',
			GBP: 'イギリスポンド',
			AUD: 'オーストラリアドル',
			CAD: 'カナダドル',
			CNY: '中国人民元',
			KRW: '韓国ウォン',
			BTC: 'ビットコイン',
			ETH: 'イーサリアム',
			XRP: 'リップル',
			DOGE: 'ドージコイン',
			SOL: 'ソラナ',
			ADA: 'カルダノ',
			DOT: 'ポルカドット'
		};
	}

	public init(): void {
		this.createCards();
		this.updateTime();
		void this.updateRates();
		setInterval(() => this.updateTime(), 1000);
		setInterval(() => void this.updateRates(), 15000);
	}

	private createCards(): void {
		[...this.fiatCurrencies, ...this.cryptoCurrencies].forEach(currency => {
			const card = document.createElement('div');
			card.className = 'rate-card';
			card.innerHTML = `
				<h3>${currency}</h3>
				<div class="currency-name">${this.currencyNames[currency]}</div>
				<p id="${currency}-rate">読み込み中...</p>
				<div id="${currency}-error" class="error"></div>
			`;
			this.container.appendChild(card);
		});
	}

	private updateTime(): void {
		const now = new Date();
		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			weekday: 'short',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		};
		this.timeDisplay.textContent = now
			.toLocaleString('ja-JP', options)
			.replace(/(\d{4}\/\d{2}\/\d{2})/, '$1 ');
	}

	private async updateRates(): Promise<void> {
		await Promise.all([this.updateFiatRates(), this.updateCryptoRates()]);
	}

	private async updateFiatRates(): Promise<void> {
		try {
			const response = await fetch(this.exchangeRateBaseUrl);
			if (!response.ok) throw new Error('為替レートの取得に失敗しました');
			const data = (await response.json()) as ExchangeApiResponse;
			this.fiatCurrencies.forEach(currency => {
				const rate = currency === 'USD' ? 1 : data.rates[currency];
				this.updateRate(currency, rate);
			});
		} catch (error: unknown) {
			console.error('為替レートAPI エラー:', error);
			this.fiatCurrencies.forEach(currency => {
				this.showError(currency, 'データの取得に失敗しました');
			});
		}
	}

	private async updateCryptoRates(): Promise<void> {
		try {
			const ids: CoinGeckoIds[] = ['bitcoin', 'ethereum', 'ripple', 'dogecoin', 'solana', 'cardano', 'polkadot'];
			const response = await fetch(`${this.cryptoBaseUrl}?ids=${ids.join(',')}&vs_currencies=usd`);
			if (!response.ok) throw new Error('仮想通貨レートの取得に失敗しました');
			const data = (await response.json()) as CoinGeckoResponse;
			const cryptoMap: Record<Crypto, CoinGeckoIds> = {
				BTC: 'bitcoin',
				ETH: 'ethereum',
				XRP: 'ripple',
				DOGE: 'dogecoin',
				SOL: 'solana',
				ADA: 'cardano',
				DOT: 'polkadot'
			};
			this.cryptoCurrencies.forEach(currency => {
				const rate = data[cryptoMap[currency]]?.usd;
				this.updateRate(currency, rate);
			});
		} catch (error: unknown) {
			console.error('仮想通貨API エラー:', error);
			this.cryptoCurrencies.forEach(currency => {
				this.showError(currency, 'データの取得に失敗しました');
			});
		}
	}

	private updateRate(currency: Fiat | Crypto, rate: number | undefined): void {
		const rateElement = document.getElementById(`${currency}-rate`);
		const errorElement = document.getElementById(`${currency}-error`);
		if (rateElement && errorElement && rate !== undefined && rate !== null) {
			rateElement.textContent = typeof rate === 'number' ? rate.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) : String(rate);
			errorElement.textContent = '';
			rateElement.classList.remove('rate-up', 'rate-down');
			void (rateElement as HTMLElement).offsetWidth;
			const oldRate = parseFloat((rateElement as HTMLElement).dataset.oldRate || '0');
			if (oldRate && rate !== oldRate) {
				(rateElement as HTMLElement).classList.add(rate > oldRate ? 'rate-up' : 'rate-down');
			}
			(rateElement as HTMLElement).dataset.oldRate = String(rate);
		}
	}

	private showError(currency: Fiat | Crypto, message: string): void {
		const errorElement = document.getElementById(`${currency}-error`);
		const rateElement = document.getElementById(`${currency}-rate`);
		if (errorElement && rateElement) {
			errorElement.textContent = message;
			rateElement.textContent = '---';
		}
	}
}

// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ExchangeComponent = ExchangeComponent;


