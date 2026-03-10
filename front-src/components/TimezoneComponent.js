"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimezoneComponent = void 0;
class TimezoneComponent {
    constructor() {
        this.dateInput = document.getElementById('date-input');
        this.timeInput = document.getElementById('time-input');
        this.timezoneSelect = document.getElementById('timezone-select');
        this.convertButton = document.getElementById('convert-timezone');
        this.resultDiv = document.getElementById('timezone-result');
        this.resetButton = document.getElementById('reset-time');
    }
    init() {
        this.setCurrentTime();
        this.setupEventListeners();
        // jQuery clockpicker 初期化（型なしプラグインのため any キャスト）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        $('.clockpicker').clockpicker({ autoclose: true, twelvehour: false, donetext: '完了' });
    }
    setupEventListeners() {
        this.convertButton.addEventListener('click', () => this.convertTimezone());
        this.timeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter')
                this.convertTimezone();
        });
        this.resetButton.addEventListener('click', () => this.setCurrentTime());
    }
    setCurrentTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        this.dateInput.value = `${year}-${month}-${day}`;
        this.timeInput.value = `${hours}:${minutes}`;
    }
    convertTimezone() {
        try {
            const inputDate = this.dateInput.value;
            const inputTime = this.timeInput.value;
            const selectedTimezone = this.timezoneSelect.value;
            if (!inputDate || !inputTime)
                throw new Error('日付と時間を入力してほしいのじゃ！');
            const inputDateTime = new Date(`${inputDate}T${inputTime}`);
            const sourceTz = selectedTimezone;
            const sourceFormatter = new Intl.DateTimeFormat('ja-JP', {
                timeZone: sourceTz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZoneName: 'long'
            });
            const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
                timeZone: 'Asia/Tokyo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZoneName: 'long'
            });
            const utcTime = new Date(Date.UTC(inputDateTime.getFullYear(), inputDateTime.getMonth(), inputDateTime.getDate(), inputDateTime.getHours(), inputDateTime.getMinutes()));
            const sourceOffset = tzOffsets[sourceTz];
            utcTime.setMinutes(utcTime.getMinutes() - sourceOffset);
            this.resultDiv.innerHTML = `
				<div class="timezone-result-item">
					<span class="timezone-label">入力時間：</span>
					<span class="timezone-time">${sourceFormatter.format(inputDateTime)}</span>
				</div>
				<div class="timezone-result-item">
					<span class="timezone-label">日本時間：</span>
					<span class="timezone-time">${jstFormatter.format(utcTime)}</span>
				</div>
				<div class="timezone-result-item">
					<span class="timezone-label">UTC時間：</span>
					<span class="timezone-time">${utcTime.toISOString().replace('T', ' ').substring(0, 16)} UTC</span>
				</div>
			`;
            this.resultDiv.style.color = '#2c3e50';
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.resultDiv.textContent = `⚠️ ${message}`;
            this.resultDiv.style.color = 'red';
        }
    }
}
exports.TimezoneComponent = TimezoneComponent;
const tzOffsets = {
    'America/Los_Angeles': -7 * 60,
    'America/New_York': -4 * 60,
    'Europe/London': 0,
    'Europe/Paris': 1 * 60,
    'Asia/Singapore': 8 * 60,
    'Australia/Sydney': 11 * 60,
    'Asia/Tokyo': 9 * 60
};
// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.TimezoneComponent = TimezoneComponent;
