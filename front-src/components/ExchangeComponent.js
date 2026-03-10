"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeComponent = void 0;
class ExchangeComponent {
    constructor() {
        this.timeDisplay = document.getElementById('time-display');
        this.container = document.getElementById('grid-container');
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
    init() {
        this.createCards();
        this.updateTime();
        void this.updateRates();
        setInterval(() => this.updateTime(), 1000);
        setInterval(() => void this.updateRates(), 15000);
    }
    createCards() {
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
    updateTime() {
        const now = new Date();
        const options = {
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
    async updateRates() {
        await Promise.all([this.updateFiatRates(), this.updateCryptoRates()]);
    }
    async updateFiatRates() {
        try {
            const response = await fetch(this.exchangeRateBaseUrl);
            if (!response.ok)
                throw new Error('為替レートの取得に失敗しました');
            const data = (await response.json());
            this.fiatCurrencies.forEach(currency => {
                const rate = currency === 'USD' ? 1 : data.rates[currency];
                this.updateRate(currency, rate);
            });
        }
        catch (error) {
            console.error('為替レートAPI エラー:', error);
            this.fiatCurrencies.forEach(currency => {
                this.showError(currency, 'データの取得に失敗しました');
            });
        }
    }
    async updateCryptoRates() {
        try {
            const ids = ['bitcoin', 'ethereum', 'ripple', 'dogecoin', 'solana', 'cardano', 'polkadot'];
            const response = await fetch(`${this.cryptoBaseUrl}?ids=${ids.join(',')}&vs_currencies=usd`);
            if (!response.ok)
                throw new Error('仮想通貨レートの取得に失敗しました');
            const data = (await response.json());
            const cryptoMap = {
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
        }
        catch (error) {
            console.error('仮想通貨API エラー:', error);
            this.cryptoCurrencies.forEach(currency => {
                this.showError(currency, 'データの取得に失敗しました');
            });
        }
    }
    updateRate(currency, rate) {
        const rateElement = document.getElementById(`${currency}-rate`);
        const errorElement = document.getElementById(`${currency}-error`);
        if (rateElement && errorElement && rate !== undefined && rate !== null) {
            rateElement.textContent = typeof rate === 'number' ? rate.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) : String(rate);
            errorElement.textContent = '';
            rateElement.classList.remove('rate-up', 'rate-down');
            void rateElement.offsetWidth;
            const oldRate = parseFloat(rateElement.dataset.oldRate || '0');
            if (oldRate && rate !== oldRate) {
                rateElement.classList.add(rate > oldRate ? 'rate-up' : 'rate-down');
            }
            rateElement.dataset.oldRate = String(rate);
        }
    }
    showError(currency, message) {
        const errorElement = document.getElementById(`${currency}-error`);
        const rateElement = document.getElementById(`${currency}-rate`);
        if (errorElement && rateElement) {
            errorElement.textContent = message;
            rateElement.textContent = '---';
        }
    }
}
exports.ExchangeComponent = ExchangeComponent;
// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.ExchangeComponent = ExchangeComponent;
