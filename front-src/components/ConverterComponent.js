"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConverterComponent = void 0;
class ConverterComponent {
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
            ],
            JP: [
                { unit: '京', value: 1e16, suffix: 'Q' },
                { unit: '兆', value: 1e12, suffix: 'T' },
                { unit: '億', value: 1e8, suffix: 'B' },
                { unit: '万', value: 1e4, suffix: 'M' }
            ]
        };
    }
    init() {
        this.input = document.getElementById('converter-input');
        this.currencySelector = document.getElementById('currency-selector');
        this.unitSelector = document.getElementById('unit-selector');
        this.modeToggle = document.getElementById('mode-toggle');
        this.resultDiv = document.getElementById('converter-result');
        this.convertButton = document.getElementById('convert-button');
        this.rateDisplay = document.getElementById('exchangeRateDisplay');
        this.refreshButton = document.querySelector('.refresh-button');
        this.setupEventListeners();
        void this.fetchExchangeRate();
        setInterval(() => void this.fetchExchangeRate(), 60000);
    }
    setupEventListeners() {
        this.convertButton.addEventListener('click', () => this.convertNumber());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter')
                this.convertNumber();
        });
        this.modeToggle.addEventListener('change', () => {
            this.updatePlaceholder();
            this.currencySelector.style.display = this.modeToggle.checked ? 'none' : 'block';
            this.unitSelector.style.display = this.modeToggle.checked ? 'block' : 'none';
        });
        this.refreshButton.addEventListener('click', () => this.refreshRate());
    }
    async fetchExchangeRate() {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = (await response.json());
            const newRate = data.rates.JPY;
            const diff = this.previousRate !== null ? newRate - this.previousRate : 0;
            this.previousRate = newRate;
            this.exchangeRate = newRate;
            let diffElement = '';
            if (diff !== 0) {
                diffElement = `<span class="rate-diff ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}円</span>`;
            }
            else {
                diffElement = '<span class="rate-diff same">(変更なし)</span>';
            }
            this.rateDisplay.innerHTML = `1ドル = ${newRate.toFixed(2)}円 ${diffElement}`;
        }
        catch (error) {
            console.error('為替レート取得失敗:', error);
            this.rateDisplay.innerHTML = '更新失敗 - デフォルト値使用中';
        }
    }
    refreshRate() {
        this.rateDisplay.textContent = '更新中...';
        void this.fetchExchangeRate();
    }
    updatePlaceholder() {
        const examples = {
            currency: '例: 1000円 または $15',
            parameter: '例: 1.5Bパラメーター'
        };
        const mode = this.modeToggle.checked ? 'parameter' : 'currency';
        this.input.placeholder = examples[mode];
    }
    convertNumber() {
        const mode = this.modeToggle.checked ? 'parameter' : 'currency';
        const input = this.input.value.trim();
        try {
            if (!input)
                throw new Error('入力が空っぽなのじゃ');
            let result;
            if (mode === 'currency') {
                result = this.convertCurrency(input);
                this.resultDiv.innerHTML = result;
            }
            else {
                result = this.convertParameter(input);
                this.resultDiv.textContent = result;
            }
            this.resultDiv.style.color = '#2c3e50';
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.resultDiv.textContent = `⚠️ ${message}`;
            this.resultDiv.style.color = 'red';
        }
    }
    convertCurrency(input) {
        const jpyRadio = this.currencySelector.querySelector('input[value="JPY"]');
        const isYenToDollar = Boolean(jpyRadio?.checked);
        const numericValue = this.convertUnitToNumber(input.replace(/[$円¥,\s]/g, ''));
        if (isYenToDollar) {
            const usdValue = numericValue / this.exchangeRate;
            const usdFormatted = this.formatCurrencyWithUnits(usdValue, 'USD');
            const jpyFormatted = this.formatCurrencyWithUnits(numericValue, 'JPY');
            return `${usdFormatted} (約${jpyFormatted})`;
        }
        else {
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
    convertParameter(input) {
        const selectedUnitEl = this.unitSelector.querySelector('select');
        const selectedUnit = (selectedUnitEl?.value ?? '');
        const isEnToJpEl = this.unitSelector.querySelector('input[value="en-to-jp"]');
        const isEnToJp = Boolean(isEnToJpEl?.checked);
        const numericValue = parseFloat(input.replace(/[^0-9.]/g, ''));
        if (isEnToJp) {
            const enToJpResult = this.enToJp(`${numericValue}${selectedUnit}`);
            return `${enToJpResult.split(' ')[0]}パラメーター (${enToJpResult.split('(')[1]}`;
        }
        else {
            const jpToEnResult = this.jpToEn(`${numericValue}${selectedUnit}`);
            return `${jpToEnResult.split(' ')[0]}パラメーター (${jpToEnResult.split('(')[1]}`;
        }
    }
    enToJp(value) {
        const selectedUnitEl = this.unitSelector.querySelector('select');
        const selectedUnit = (selectedUnitEl?.value ?? '');
        const unitInfo = this.UNITS.EN.find(u => u.suffix === selectedUnit);
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (isNaN(num) || !unitInfo)
            throw new Error('数値が正しくないのじゃ');
        const valueInNumber = num * unitInfo.value;
        for (const { unit, value: unitValue } of this.UNITS.JP) {
            if (valueInNumber >= unitValue) {
                const converted = (valueInNumber / unitValue).toLocaleString('ja-JP', {
                    maximumFractionDigits: 3,
                    minimumFractionDigits: 1
                });
                const formatted = converted.replace(/(\.\d*?[1-9])0+$/, '$1');
                return `${formatted}${unit} (${valueInNumber.toExponential()})`;
            }
        }
        return `${valueInNumber.toLocaleString('ja-JP')} (${valueInNumber.toExponential()})`;
    }
    jpToEn(value) {
        const selectedUnitEl = this.unitSelector.querySelector('select');
        const selectedUnit = (selectedUnitEl?.value ?? '');
        const unitInfo = this.UNITS.EN.find(u => u.suffix === selectedUnit);
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (isNaN(num) || !unitInfo)
            throw new Error('数値が正しくないのじゃ');
        const valueInNumber = num * unitInfo.value;
        for (const { suffix, value: suffixValue } of this.UNITS.EN) {
            if (valueInNumber >= suffixValue) {
                const converted = (valueInNumber / suffixValue)
                    .toFixed(3)
                    .replace(/\.?0+$/, '')
                    .replace(/(\..*?)0+$/, '$1');
                return `${converted}${suffix} (${valueInNumber.toExponential()})`;
            }
        }
        return `${valueInNumber.toLocaleString('ja-JP')} (${valueInNumber.toExponential()})`;
    }
    convertUnitToNumber(str) {
        let s = str.toUpperCase().replace(/,/g, '');
        const unitMap = Object.fromEntries(this.UNITS.EN.map(u => [u.suffix, u.value]));
        const match = s.match(/^([\d.]+)([QTBMK]?)$/);
        if (!match)
            throw new Error('数値変換できませんのじゃ');
        const value = parseFloat(match[1]);
        const unit = (match[2] || ' ');
        return value * ((unit === ' ' ? 1 : unitMap[unit]));
    }
    formatCurrencyWithUnits(value, currency) {
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
        }
        else {
            const usdUnits = [
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
exports.ConverterComponent = ConverterComponent;
// 既存の app.js がグローバル参照するため公開
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.ConverterComponent = ConverterComponent;
