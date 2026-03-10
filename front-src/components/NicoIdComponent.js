"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NicoIdComponent = void 0;
class NicoIdComponent {
    constructor() {
        this.input = document.getElementById('nicoid-input');
        this.resultDiv = document.getElementById('nicoid-result');
        this.statsDiv = document.getElementById('stats');
        this.copyButton = document.getElementById('copy-button');
        this.clearButton = document.getElementById('clear-button');
        this.extractButton = document.getElementById('extract-button');
    }
    init() {
        this.setupEventListeners();
    }
    setupEventListeners() {
        this.input.addEventListener('input', () => this.updateStats());
        this.extractButton.addEventListener('click', () => this.extractIds());
        this.copyButton.addEventListener('click', () => this.copyIds());
        this.clearButton.addEventListener('click', () => this.clearField());
    }
    updateStats() {
        const input = this.input.value;
        const charCount = input.length;
        const lineCount = input.split('\n').length;
        this.statsDiv.innerHTML = `文字数: ${charCount} | 行数: ${lineCount}`;
    }
    extractIds() {
        const input = this.input.value;
        const regex = /[a-z]{2}[0-9]{1,11}/g;
        const matches = input.match(regex) || [];
        const uniqueIds = [...new Set(matches)];
        if (uniqueIds.length > 0) {
            this.resultDiv.innerHTML = uniqueIds.join('<br>');
            this.copyButton.style.display = 'inline';
        }
        else {
            this.resultDiv.innerHTML = 'IDが見つかりませんでした。';
            this.copyButton.style.display = 'none';
        }
    }
    async copyIds() {
        const textToCopy = this.resultDiv.innerText;
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showToast(`IDをクリップボードにコピーしました！\n${textToCopy}`);
        }
        catch (err) {
            console.error('コピーに失敗しました:', err);
            this.showToast('コピーに失敗しました。');
        }
    }
    clearField() {
        this.input.value = '';
        this.resultDiv.innerHTML = '';
        this.copyButton.style.display = 'none';
        this.statsDiv.innerHTML = '文字数: 0 | 行数: 0';
    }
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}
exports.NicoIdComponent = NicoIdComponent;
// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.NicoIdComponent = NicoIdComponent;
