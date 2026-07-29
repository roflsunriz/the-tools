import { mdiRefresh } from '@mdi/js';
import { setButtonIcon } from '../shared/icons.ts';

interface UnitConversionResponse {
	result?: unknown;
	error?: unknown;
}

export class ConverterComponent {
	private exchangeRate: number;
	private previousRate: number | null;

	private input!: HTMLInputElement;
	private currencySelector!: HTMLElement;
	private unitSelector!: HTMLElement;
	private modeToggle!: HTMLInputElement;
	private resultDiv!: HTMLElement;
	private convertButton!: HTMLButtonElement;
	private rateDisplay!: HTMLElement;
	private refreshButton!: HTMLElement;

	constructor() {
		this.exchangeRate = 152;
		this.previousRate = null;
	}

	public init(): void {
		this.input = document.getElementById('converter-input') as HTMLInputElement;
		this.currencySelector = document.getElementById('currency-selector') as HTMLElement;
		this.unitSelector = document.getElementById('unit-selector') as HTMLElement;
		this.modeToggle = document.getElementById('mode-toggle') as HTMLInputElement;
		this.resultDiv = document.getElementById('converter-result') as HTMLElement;
		this.convertButton = document.getElementById('convert-button') as HTMLButtonElement;
		this.rateDisplay = document.getElementById('exchangeRateDisplay') as HTMLElement;
		this.refreshButton = document.getElementById('converter-refresh') as HTMLElement;

		setButtonIcon(this.refreshButton, mdiRefresh);

		this.setupEventListeners();
		void this.fetchExchangeRate();
		setInterval(() => void this.fetchExchangeRate(), 60000);
	}

	private setupEventListeners(): void {
		this.convertButton.addEventListener('click', () => void this.convertNumber());
		this.input.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') void this.convertNumber();
		});
		this.modeToggle.addEventListener('change', () => {
			this.updatePlaceholder();
			(this.currencySelector as HTMLElement).style.display = this.modeToggle.checked ? 'none' : 'block';
			(this.unitSelector as HTMLElement).style.display = this.modeToggle.checked ? 'block' : 'none';
		});
		this.refreshButton.addEventListener('click', () => this.refreshRate());
	}

	private async fetchExchangeRate(): Promise<void> {
		try {
			const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
			const data = (await response.json()) as { rates: { JPY: number } };
			const newRate = data.rates.JPY;

			const diff = this.previousRate !== null ? newRate - this.previousRate : 0;
			this.previousRate = newRate;
			this.exchangeRate = newRate;

			let diffElement = '';
			if (diff !== 0) {
				diffElement = `<span class="rate-diff ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}円</span>`;
			} else {
				diffElement = '<span class="rate-diff same">(変更なし)</span>';
			}

			this.rateDisplay.innerHTML = `1ドル = ${newRate.toFixed(2)}円 ${diffElement}`;
		} catch (error: unknown) {
			console.error('為替レート取得失敗:', error);
			this.rateDisplay.innerHTML = '更新失敗 - デフォルト値使用中';
		}
	}

	private refreshRate(): void {
		this.rateDisplay.textContent = '更新中...';
		void this.fetchExchangeRate();
	}

	private updatePlaceholder(): void {
		const examples = {
			currency: '例: 400おくどる、$15、1000円',
			parameter: '例: ２．５ Ｂを億単位、小数2桁で'
		} as const;
		const mode = this.modeToggle.checked ? 'parameter' : 'currency';
		this.input.placeholder = examples[mode];
	}

	public async convertNumber(): Promise<void> {
		const mode = this.modeToggle.checked ? 'parameter' : 'currency';
		const input = this.input.value.trim();

		try {
			if (!input) throw new Error('入力が空っぽなのじゃ');

			this.setConversionLoading(true);
			this.resultDiv.textContent = '入力内容を読み取っています…';
			if (mode === 'currency') {
				const jpyRadio = this.currencySelector.querySelector('input[value="JPY"]') as HTMLInputElement | null;
				await this.requestConversion('/api/currency-convert', {
					input,
					exchangeRate: this.exchangeRate,
					defaultSourceCurrency: jpyRadio?.checked ? 'JPY' : 'USD',
				});
			} else {
				this.resultDiv.textContent = 'Sakura AIが表現を読み取っています…';
				await this.requestConversion('/api/unit-convert', { input });
			}

			this.resultDiv.style.color = '#2c3e50';
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			this.resultDiv.textContent = `⚠️ ${message}`;
			this.resultDiv.style.color = 'red';
		} finally {
			this.setConversionLoading(false);
		}
	}

	private setConversionLoading(loading: boolean): void {
		this.convertButton.disabled = loading;
		this.input.disabled = loading;
		this.convertButton.textContent = loading ? '変換中…' : '変換';
	}

	private async requestConversion(endpoint: string, body: Record<string, unknown>): Promise<void> {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		const data = await response.json() as UnitConversionResponse;
		if (!response.ok) {
			throw new Error(typeof data.error === 'string' ? data.error : '数値変換に失敗しました。');
		}
		if (typeof data.result !== 'string') {
			throw new Error('数値変換APIの応答形式が不正です。');
		}
		this.resultDiv.textContent = data.result;
	}
}

// 既存の app.js がグローバル参照するため公開
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ConverterComponent = ConverterComponent;


