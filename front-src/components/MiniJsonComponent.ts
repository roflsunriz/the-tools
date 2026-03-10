type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonArray | JsonObject;
type JsonArray = JsonValue[];
interface JsonObject {
	[key: string]: JsonValue;
}

type LegendEntry = {
	alias: string;
	original: string;
	count: number;
};

type SummaryStats = {
	aliasCount: number;
	beforeLength: number;
	afterLength: number;
	savings: number;
	ratio: number;
};

export class MiniJsonComponent {
	private input: HTMLTextAreaElement;
	private prettyOutput: HTMLTextAreaElement;
	private minifiedOutput: HTMLTextAreaElement;
	private legend: HTMLElement;
	private legendCopyButton: HTMLElement;
	private summary: HTMLElement;
	private errorBox: HTMLElement;
	private convertButton: HTMLElement;
	private copyButton: HTMLElement;
	private clearButton: HTMLElement;
	private latestLegendEntries: LegendEntry[] = [];

	constructor() {
		this.input = document.getElementById('mini-json-input') as HTMLTextAreaElement;
		this.prettyOutput = document.getElementById('mini-json-output') as HTMLTextAreaElement;
		this.minifiedOutput = document.getElementById('mini-json-minified') as HTMLTextAreaElement;
		this.legend = document.getElementById('mini-json-legend') as HTMLElement;
		this.legendCopyButton = document.getElementById('mini-json-copy-legend') as HTMLElement;
		this.summary = document.getElementById('mini-json-summary') as HTMLElement;
		this.errorBox = document.getElementById('mini-json-error') as HTMLElement;
		this.convertButton = document.getElementById('mini-json-run') as HTMLElement;
		this.copyButton = document.getElementById('mini-json-copy') as HTMLElement;
		this.clearButton = document.getElementById('mini-json-clear') as HTMLElement;
	}

	public init(): void {
		this.convertButton.addEventListener('click', () => this.handleConvert());
		this.copyButton.addEventListener('click', () => {
			void this.copyMinified();
		});
		this.legendCopyButton.addEventListener('click', () => {
			void this.copyLegend();
		});
		this.clearButton.addEventListener('click', () => this.handleClear());
	}

	private handleConvert(): void {
		this.hideError();
		const rawText = this.input.value.trim();
		if (!rawText) {
			this.showError('JSON文字列を入力してください。');
			return;
		}

		try {
			const parsedUnknown: unknown = JSON.parse(rawText);
			if (!this.isJsonValue(parsedUnknown)) {
				throw new Error('JSONとして処理できない要素が含まれています。');
			}
			const parsed = parsedUnknown;
			const compactSource = JSON.stringify(parsed);
			const { transformed, legend } = this.compressJson(parsed);
			const pretty = JSON.stringify(transformed, null, 2);
			const minified = JSON.stringify(transformed);

			this.prettyOutput.value = pretty;
			this.minifiedOutput.value = minified;
			this.copyButton.style.display = minified ? 'inline-block' : 'none';

			this.renderLegend(legend);
			this.renderSummary({
				aliasCount: legend.length,
				beforeLength: compactSource.length,
				afterLength: minified.length,
				savings: compactSource.length - minified.length,
				ratio:
					compactSource.length === 0
						? 0
						: ((compactSource.length - minified.length) / compactSource.length) * 100
			});
		} catch (error: unknown) {
			this.latestLegendEntries = [];
			this.setLegendCopyVisibility(false);
			const message =
				error instanceof Error ? error.message : 'JSONの解析中に想定外のエラーが発生しました。';
			this.showError(message);
			this.copyButton.style.display = 'none';
		}
	}

	private compressJson(value: JsonValue): { transformed: JsonValue; legend: LegendEntry[] } {
		const keyCounts = new Map<string, number>();
		this.collectKeyCounts(value, keyCounts);
		const duplicates = [...keyCounts.entries()].filter(([, count]) => count > 1);

		if (duplicates.length === 0) {
			return { transformed: value, legend: [] };
		}

		duplicates.sort((a, b) => {
			if (b[1] === a[1]) {
				return a[0].localeCompare(b[0]);
			}
			return b[1] - a[1];
		});

		const reserved = new Set<string>(keyCounts.keys());
		const aliasUsage = new Set<string>();
		const aliasMap = new Map<string, string>();
		const legend: LegendEntry[] = [];

		for (const [original, count] of duplicates) {
			const alias = this.generateAlias(original, aliasUsage, reserved);
			aliasMap.set(original, alias);
			legend.push({ alias, original, count });
		}

		const transformed = this.rewriteValue(value, aliasMap);
		return { transformed, legend };
	}

	private collectKeyCounts(value: JsonValue, counts: Map<string, number>): void {
		if (Array.isArray(value)) {
			value.forEach(item => this.collectKeyCounts(item, counts));
			return;
		}

		if (value !== null && typeof value === 'object') {
			const record = value as JsonObject;
			for (const [key, child] of Object.entries(record)) {
				counts.set(key, (counts.get(key) ?? 0) + 1);
				this.collectKeyCounts(child, counts);
			}
		}
	}

	private rewriteValue(value: JsonValue, aliasMap: Map<string, string>): JsonValue {
		if (aliasMap.size === 0) {
			return value;
		}

		if (Array.isArray(value)) {
			return value.map(item => this.rewriteValue(item, aliasMap));
		}

		if (value !== null && typeof value === 'object') {
			const record = value as JsonObject;
			const result: JsonObject = {};
			for (const [key, child] of Object.entries(record)) {
				const nextKey = aliasMap.get(key) ?? key;
				result[nextKey] = this.rewriteValue(child, aliasMap);
			}
			return result;
		}

		return value;
	}

	private generateAlias(original: string, used: Set<string>, reserved: Set<string>): string {
		const sanitized = original.replace(/[^a-zA-Z0-9]/g, '');
		const lower = sanitized.toLowerCase();
		const prefix = lower.slice(0, 1) || 'k';
		const candidates: string[] = [];

		if (lower.length > 0) {
			candidates.push(prefix);
			if (lower.length > 1) candidates.push(lower.slice(0, 2));
			if (lower.length > 2) candidates.push(lower.slice(0, 3));

			const camelChunks = original.match(/[A-Za-z][a-z0-9]*/g);
			if (camelChunks && camelChunks.length > 1) {
				candidates.push(camelChunks.map(chunk => chunk[0]?.toLowerCase() ?? '').join(''));
			}
		} else {
			candidates.push('k');
		}

		for (const candidate of candidates) {
			if (candidate && !used.has(candidate) && !reserved.has(candidate)) {
				used.add(candidate);
				return candidate;
			}
		}

		let suffix = 1;
		let fallback = prefix;
		while (used.has(fallback) || reserved.has(fallback)) {
			fallback = `${prefix}${suffix}`;
			suffix += 1;
		}
		used.add(fallback);
		return fallback;
	}

	private renderLegend(entries: LegendEntry[]): void {
		this.latestLegendEntries = entries;
		this.legend.innerHTML = '';
		if (entries.length === 0) {
			const emptyState = document.createElement('p');
			emptyState.textContent = '短縮対象のキーは見つかりませんでした。';
			this.legend.appendChild(emptyState);
			this.setLegendCopyVisibility(false);
			return;
		}

		const fragment = document.createDocumentFragment();
		for (const entry of entries) {
			const row = document.createElement('div');
			row.className = 'legend-item';

			const aliasSpan = document.createElement('span');
			aliasSpan.className = 'legend-alias';
			aliasSpan.textContent = entry.alias;

			const detailSpan = document.createElement('span');
			detailSpan.className = 'legend-detail';
			detailSpan.textContent = `${entry.original} (${entry.count}回)`;

			row.append(aliasSpan, detailSpan);
			fragment.appendChild(row);
		}

		this.legend.appendChild(fragment);
		this.setLegendCopyVisibility(true);
	}

	private renderSummary(stats: SummaryStats): void {
		const { aliasCount, beforeLength, afterLength, savings, ratio } = stats;
		this.summary.innerHTML = '';

		const differenceLabel = savings >= 0 ? '削減' : '増加';
		const lines = [
			`短縮対象キー: ${aliasCount}件`,
			`minify前(JSON.stringifyベース): ${beforeLength.toLocaleString()}文字`,
			`minify後: ${afterLength.toLocaleString()}文字`,
			`サイズ差(${differenceLabel}): ${savings >= 0 ? '-' : '+'}${Math.abs(savings).toLocaleString()}文字 (${ratio.toFixed(2)}%)`
		];

		const fragment = document.createDocumentFragment();
		for (const text of lines) {
			const paragraph = document.createElement('p');
			paragraph.textContent = text;
			fragment.appendChild(paragraph);
		}

		this.summary.appendChild(fragment);
	}

	private async copyMinified(): Promise<void> {
		const text = this.minifiedOutput.value;
		if (!text) {
			this.showError('コピーできる結果がまだありません。');
			return;
		}

		try {
			await navigator.clipboard.writeText(text);
			this.showToast('ミニマムJSONをコピーしました。');
		} catch (error: unknown) {
			console.error('clipboard-error', error);
			this.showError('クリップボードへのコピーに失敗しました。ブラウザーの許可を確認してください。');
		}
	}

	private async copyLegend(): Promise<void> {
		if (this.latestLegendEntries.length === 0) {
			this.showError('凡例がまだ生成されていません。まずはJSONを変換してください。');
			return;
		}

		const lines = this.latestLegendEntries.map(
			entry => `${entry.alias}: ${entry.original} (${entry.count}回)`
		);

		try {
			await navigator.clipboard.writeText(lines.join('\n'));
			this.showToast('短縮キー凡例をコピーしました。');
		} catch (error: unknown) {
			console.error('clipboard-legend-error', error);
			this.showError('凡例のコピーに失敗しました。ブラウザーの許可を確認してください。');
		}
	}

	private handleClear(): void {
		this.input.value = '';
		this.prettyOutput.value = '';
		this.minifiedOutput.value = '';
		this.legend.innerHTML = '';
		this.latestLegendEntries = [];
		this.summary.innerHTML = '';
		this.copyButton.style.display = 'none';
		this.setLegendCopyVisibility(false);
		this.hideError();
	}

	private showError(message: string): void {
		this.errorBox.textContent = message;
		this.errorBox.style.display = 'block';
	}

	private hideError(): void {
		this.errorBox.textContent = '';
		this.errorBox.style.display = 'none';
	}

	private showToast(message: string): void {
		const toast = document.createElement('div');
		toast.className = 'toast';
		toast.textContent = message;
		document.body.appendChild(toast);

		requestAnimationFrame(() => {
			toast.classList.add('show');
		});

		setTimeout(() => {
			toast.classList.remove('show');
			setTimeout(() => {
				document.body.removeChild(toast);
			}, 300);
		}, 2500);
	}

	private setLegendCopyVisibility(visible: boolean): void {
		this.legendCopyButton.style.display = visible ? 'inline-block' : 'none';
	}

	private isJsonValue(value: unknown): value is JsonValue {
		if (
			value === null ||
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			return true;
		}

		if (Array.isArray(value)) {
			return value.every(item => this.isJsonValue(item));
		}

		if (typeof value === 'object') {
			return Object.values(value as Record<string, unknown>).every(item => this.isJsonValue(item));
		}

		return false;
	}
}
