import { mdiRefresh } from '@mdi/js';
import { setButtonIcon } from '../shared/icons.ts';

type UnitEN = { suffix: 'Q' | 'T' | 'B' | 'M' | 'K'; value: number; name: '京' | '兆' | '億' | '万' | '千' };
interface UnitConversionResponse {
	result?: unknown;
	error?: unknown;
}

export class ConverterComponent {
	private exchangeRate: number;
	private previousRate: number | null;
	private readonly UNITS: { EN: UnitEN[] };

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
		this.UNITS = {
			EN: [
				{ suffix: 'Q', value: 1e15, name: '京' },
				{ suffix: 'T', value: 1e12, name: '兆' },
				{ suffix: 'B', value: 1e9, name: '億' },
				{ suffix: 'M', value: 1e6, name: '万' },
				{ suffix: 'K', value: 1e3, name: '千' }
			]
		};
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
			currency: '例: 1000円 または $15',
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

			if (mode === 'currency') {
				this.resultDiv.innerHTML = this.convertCurrency(input);
			} else {
				this.setConversionLoading(true);
				this.resultDiv.textContent = 'Sakura AIが表現を読み取っています…';
				const response = await fetch('/api/unit-convert', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ input }),
				});
				const data = await response.json() as UnitConversionResponse;
				if (!response.ok) {
					throw new Error(typeof data.error === 'string' ? data.error : '単位変換に失敗しました。');
				}
				if (typeof data.result !== 'string') {
					throw new Error('単位変換APIの応答形式が不正です。');
				}
				this.resultDiv.textContent = data.result;
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

	private convertCurrency(input: string): string {
		const jpyRadio = this.currencySelector.querySelector('input[value="JPY"]') as HTMLInputElement | null;
		const isYenToDollar = Boolean(jpyRadio?.checked);
		const numericValue = this.convertUnitToNumber(input.replace(/[$円¥,\s]/g, ''));

		if (isYenToDollar) {
			const usdValue = numericValue / this.exchangeRate;
			const usdFormatted = this.formatCurrencyWithUnits(usdValue, 'USD');
			const jpyFormatted = this.formatCurrencyWithUnits(numericValue, 'JPY');
			return `${usdFormatted} (約${jpyFormatted})`;
		} else {
			const jpyValue = numericValue * this.exchangeRate;
			const withTax = Math.floor(jpyValue * 1.1);
			const withReducedTax = Math.floor(jpyValue * 1.08);

			const jpyFormatted = this.formatCurrencyWithUnits(jpyValue, 'JPY');
			const usdFormatted = this.formatCurrencyWithUnits(numericValue, 'USD');
			const taxFormatted = this.formatCurrencyWithUnits(withTax, 'JPY');
			const reducedTaxFormatted = this.formatCurrencyWithUnits(withReducedTax, 'JPY');

			return `${jpyFormatted} (${usdFormatted})
			<div class="tax-info">
				<div>消費税込(10%): ${taxFormatted}</div>
				<div>軽減税率(8%): ${reducedTaxFormatted}</div>
			</div>`;
		}
	}

	private convertUnitToNumber(str: string): number {
		let s = str.toUpperCase().replace(/,/g, '');
		const unitMap = Object.fromEntries(this.UNITS.EN.map(u => [u.suffix, u.value])) as Record<UnitEN['suffix'], number>;
		const match = s.match(/^([\d.]+)([QTBMK]?)$/);
		if (!match) throw new Error('数値変換できませんのじゃ');
		const value = parseFloat(match[1]);
		const unit = (match[2] || ' ') as UnitEN['suffix'] | ' ';
		return value * ((unit === ' ' ? 1 : unitMap[unit]));
	}

	private formatCurrencyWithUnits(value: number, currency: 'JPY' | 'USD'): string {
		const absValue = Math.abs(value);
		const isNegative = value < 0;
		const prefix = isNegative ? '-' : '';

		if (currency === 'JPY') {
			const jpyUnits = [
				{ unit: '京', value: 1e16 },
				{ unit: '兆', value: 1e12 },
				{ unit: '億', value: 1e8 },
				{ unit: '万', value: 1e4 }
			];
			for (const { unit, value: unitValue } of jpyUnits) {
				if (absValue >= unitValue) {
					const converted = (absValue / unitValue).toFixed(1).replace(/\.0$/, '');
					return `${prefix}${Math.floor(absValue).toLocaleString('ja-JP')}円 (${prefix}${converted}${unit}円)`;
				}
			}
			return `${prefix}${Math.floor(absValue).toLocaleString('ja-JP')}円`;
		} else {
			const usdUnits: Array<{ suffix: UnitEN['suffix']; value: number; name: UnitEN['name'] }> = [
				{ suffix: 'Q', value: 1e15, name: '京' },
				{ suffix: 'T', value: 1e12, name: '兆' },
				{ suffix: 'B', value: 1e9, name: '億' },
				{ suffix: 'M', value: 1e6, name: '万' },
				{ suffix: 'K', value: 1e3, name: '千' }
			];
			for (const { value: unitValue, name, suffix } of usdUnits) {
				if (absValue >= unitValue) {
					const converted = (absValue / unitValue).toFixed(1).replace(/\.0$/, '');
					return `${prefix}$${absValue.toFixed(2)} (${prefix}$${converted}${suffix}・${name}ドル)`;
				}
			}
			return `${prefix}$${absValue.toFixed(2)}`;
		}
	}
}

// 既存の app.js がグローバル参照するため公開
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ConverterComponent = ConverterComponent;


