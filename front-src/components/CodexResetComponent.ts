type ResetCredit = {
	status: string;
	resetType: string;
	grantedAt: string;
	expiresAt: string;
	redeemedAt: string | null;
};

type ResetCreditsResponse = {
	availableCount: number;
	credits: ResetCredit[];
	fetchedAt: string;
};

type ResetStatus = 'loading' | 'active' | 'empty' | 'expired' | 'error';

const REFRESH_INTERVAL_MS = 60 * 1000;

export class CodexResetComponent {
	private refreshButton!: HTMLButtonElement;
	private availableCountEl!: HTMLElement;
	private fetchedAtEl!: HTMLElement;
	private nextExpireEl!: HTMLElement;
	private remainingEl!: HTMLElement;
	private statusEl!: HTMLElement;
	private creditsListEl!: HTMLElement;
	private progressBar!: HTMLElement;
	private timerId: ReturnType<typeof setInterval> | null = null;
	private refreshTimerId: ReturnType<typeof setInterval> | null = null;
	private credits: ResetCredit[] = [];
	private availableCount: number | null = null;
	private fetchedAt: string | null = null;

	public init(): void {
		this.refreshButton = document.getElementById('codex-reset-refresh') as HTMLButtonElement;
		this.availableCountEl = document.getElementById('codex-reset-available-count') as HTMLElement;
		this.fetchedAtEl = document.getElementById('codex-reset-fetched-at') as HTMLElement;
		this.nextExpireEl = document.getElementById('codex-reset-next-expire') as HTMLElement;
		this.remainingEl = document.getElementById('codex-reset-remaining') as HTMLElement;
		this.statusEl = document.getElementById('codex-reset-status') as HTMLElement;
		this.creditsListEl = document.getElementById('codex-reset-credits') as HTMLElement;
		this.progressBar = document.getElementById('codex-reset-progress-bar') as HTMLElement;

		if (!this.refreshButton) return;

		this.refreshButton.addEventListener('click', () => {
			void this.fetchCredits();
		});
		this.timerId = setInterval(() => this.updateCountdown(), 1000);
		this.refreshTimerId = setInterval(() => {
			void this.fetchCredits();
		}, REFRESH_INTERVAL_MS);
		void this.fetchCredits();
	}

	private async fetchCredits(): Promise<void> {
		this.setStatus('CodexリセットAPIから取得中です。', 'loading');
		this.refreshButton.disabled = true;

		try {
			const response = await fetch('/api/codex-reset-credits');
			const data = await response.json() as Partial<ResetCreditsResponse> & { error?: string };

			if (!response.ok) {
				throw new Error(data.error ?? `取得に失敗しました: ${String(response.status)}`);
			}

			if (!Array.isArray(data.credits) || typeof data.availableCount !== 'number' || typeof data.fetchedAt !== 'string') {
				throw new Error('APIレスポンスの形式が不正です。');
			}

			this.credits = data.credits;
			this.availableCount = data.availableCount;
			this.fetchedAt = data.fetchedAt;
			this.render();
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			this.credits = [];
			this.availableCount = null;
			this.availableCountEl.textContent = '-';
			this.nextExpireEl.textContent = '-';
			this.remainingEl.textContent = '-';
			this.fetchedAtEl.textContent = '-';
			this.creditsListEl.textContent = '';
			this.setProgress(0);
			this.setStatus(message, 'error');
		} finally {
			this.refreshButton.disabled = false;
		}
	}

	private render(): void {
		this.availableCountEl.textContent = this.availableCount === null ? '-' : String(this.availableCount);
		this.fetchedAtEl.textContent = this.fetchedAt ? this.formatDateTime(new Date(this.fetchedAt)) : '-';
		this.renderCredits();
		this.updateCountdown();
	}

	private renderCredits(): void {
		this.creditsListEl.textContent = '';

		if (this.credits.length === 0) {
			const empty = document.createElement('p');
			empty.className = 'codex-reset-empty';
			empty.textContent = 'リセットクレジットはありません。';
			this.creditsListEl.appendChild(empty);
			return;
		}

		for (const credit of this.sortCredits(this.credits)) {
			const item = document.createElement('div');
			item.className = 'codex-reset-credit';
			item.dataset.status = credit.status;

			const title = document.createElement('div');
			title.className = 'codex-reset-credit-title';
			title.textContent = this.formatCreditTitle(credit);

			const meta = document.createElement('div');
			meta.className = 'codex-reset-credit-meta';
			meta.textContent = `付与: ${this.formatDateTime(new Date(credit.grantedAt))}`;

			const expire = document.createElement('div');
			expire.className = 'codex-reset-credit-expire';
			expire.textContent = `期限: ${this.formatDateTime(new Date(credit.expiresAt))}`;

			item.append(title, meta, expire);
			if (credit.redeemedAt) {
				const redeemed = document.createElement('div');
				redeemed.className = 'codex-reset-credit-meta';
				redeemed.textContent = `使用: ${this.formatDateTime(new Date(credit.redeemedAt))}`;
				item.appendChild(redeemed);
			}
			this.creditsListEl.appendChild(item);
		}
	}

	private updateCountdown(): void {
		const availableCredits = this.getAvailableCredits();
		const nextCredit = this.sortCredits(availableCredits)[0];

		if (!nextCredit) {
			this.nextExpireEl.textContent = '-';
			this.remainingEl.textContent = '-';
			this.setProgress(0);
			this.setStatus('利用可能なCodexリセットクレジットはありません。', this.credits.length > 0 ? 'expired' : 'empty');
			return;
		}

		const now = Date.now();
		const expiresAt = new Date(nextCredit.expiresAt).getTime();
		const grantedAt = new Date(nextCredit.grantedAt).getTime();
		const remainingMs = expiresAt - now;

		this.nextExpireEl.textContent = this.formatDateTime(new Date(expiresAt));
		this.remainingEl.textContent = this.formatRemaining(remainingMs);

		if (remainingMs <= 0) {
			this.setProgress(100);
			this.setStatus('最短のCodexリセットクレジットは期限切れです。再取得してください。', 'expired');
			return;
		}

		const totalMs = Math.max(1, expiresAt - grantedAt);
		const elapsedRatio = Math.max(0, Math.min(1, (now - grantedAt) / totalMs));
		this.setProgress(elapsedRatio * 100);
		this.setStatus('最短のCodexリセットクレジット期限までカウント中です。', 'active');
	}

	private getAvailableCredits(): ResetCredit[] {
		const now = Date.now();
		return this.credits.filter(credit => {
			const expiresAt = new Date(credit.expiresAt).getTime();
			return credit.status === 'available' && Number.isFinite(expiresAt) && expiresAt > now;
		});
	}

	private sortCredits(credits: ResetCredit[]): ResetCredit[] {
		return [...credits].sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
	}

	private formatCreditTitle(credit: ResetCredit): string {
		const statusLabel = credit.status === 'available' ? '利用可能' : credit.status;
		return `${statusLabel} / ${credit.resetType}`;
	}

	private setStatus(message: string, status: ResetStatus): void {
		this.statusEl.textContent = message;
		this.statusEl.dataset.status = status;
	}

	private setProgress(percent: number): void {
		this.progressBar.style.width = `${Math.max(0, Math.min(100, percent)).toFixed(1)}%`;
	}

	private formatRemaining(milliseconds: number): string {
		if (milliseconds <= 0) return '期限切れ';

		const totalSeconds = Math.floor(milliseconds / 1000);
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		const dayPart = days > 0 ? `${days}日 ` : '';

		return `${dayPart}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	private formatDateTime(date: Date): string {
		if (Number.isNaN(date.getTime())) return '-';

		return new Intl.DateTimeFormat('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZoneName: 'short'
		}).format(date);
	}
}
