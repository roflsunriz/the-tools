export class NicoIdComponent {
	private input!: HTMLTextAreaElement;
	private resultDiv!: HTMLElement;
	private statsDiv!: HTMLElement;
	private copyButton!: HTMLElement;
	private clearButton!: HTMLElement;
	private extractButton!: HTMLElement;

	constructor() {
		this.input = document.getElementById('nicoid-input') as HTMLTextAreaElement;
		this.resultDiv = document.getElementById('nicoid-result') as HTMLElement;
		this.statsDiv = document.getElementById('stats') as HTMLElement;
		this.copyButton = document.getElementById('copy-button') as HTMLElement;
		this.clearButton = document.getElementById('clear-button') as HTMLElement;
		this.extractButton = document.getElementById('extract-button') as HTMLElement;
	}

	public init(): void {
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		this.input.addEventListener('input', () => this.updateStats());
		this.extractButton.addEventListener('click', () => this.extractIds());
		this.copyButton.addEventListener('click', () => this.copyIds());
		this.clearButton.addEventListener('click', () => this.clearField());
	}

	private updateStats(): void {
		const input = this.input.value;
		const charCount = input.length;
		const lineCount = input.split('\n').length;
		this.statsDiv.innerHTML = `文字数: ${charCount} | 行数: ${lineCount}`;
	}

	private extractIds(): void {
		const input = this.input.value;
		const regex = /[a-z]{2}[0-9]{1,11}/g;
		const matches = input.match(regex) || [];
		const uniqueIds = [...new Set(matches)];
		if (uniqueIds.length > 0) {
			this.resultDiv.innerHTML = uniqueIds.join('<br>');
			this.copyButton.style.display = 'inline';
		} else {
			this.resultDiv.innerHTML = 'IDが見つかりませんでした。';
			this.copyButton.style.display = 'none';
		}
	}

	private async copyIds(): Promise<void> {
		const textToCopy = this.resultDiv.innerText;
		try {
			await navigator.clipboard.writeText(textToCopy);
			this.showToast(`IDをクリップボードにコピーしました！\n${textToCopy}`);
		} catch (err: unknown) {
			console.error('コピーに失敗しました:', err);
			this.showToast('コピーに失敗しました。');
		}
	}

	private clearField(): void {
		this.input.value = '';
		this.resultDiv.innerHTML = '';
		this.copyButton.style.display = 'none';
		this.statsDiv.innerHTML = '文字数: 0 | 行数: 0';
	}

	private showToast(message: string): void {
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

// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).NicoIdComponent = NicoIdComponent;


