import type { UnitInterpretation } from './unit-converter';
import { getUnitMultiplier } from './unit-converter';
import { parseJapaneseNumber } from './japanese-number';

const SAKURA_AI_ENDPOINT = 'https://api.ai.sakura.ad.jp/v1/chat/completions';
const DEFAULT_SAKURA_AI_MODEL = 'preview/Qwen3-0.6B-cpu';
const MAX_INPUT_LENGTH = 500;

type Currency = 'USD' | 'JPY';

export interface CurrencyInterpretation {
	value: number;
	sourceUnit: UnitInterpretation['sourceUnit'];
	sourceCurrency: Currency;
}

export interface CurrencyConversionResult {
	result: string;
	interpretation: CurrencyInterpretation;
	parser: 'local' | 'sakura-ai';
	verification: CurrencyVerification;
	model?: string;
}

export interface CurrencyVerification {
	normalizedInput: string;
	sourceAmount: number;
	convertedAmount: number;
	verified: true;
}

interface CurrencyConversionOptions {
	token?: string;
	model?: string;
	fetchImplementation?: typeof fetch;
}

interface SakuraCurrencyInterpretation {
	normalizedInput: string;
	sourceAmount: number;
	sourceCurrency: Currency;
	convertedAmount: number;
}

const CURRENCY_ALIASES: ReadonlyArray<{ alias: string; currency: Currency }> = [
	{ alias: 'dollars', currency: 'USD' },
	{ alias: 'dollar', currency: 'USD' },
	{ alias: 'どる', currency: 'USD' },
	{ alias: 'ドル', currency: 'USD' },
	{ alias: 'usd', currency: 'USD' },
	{ alias: '$', currency: 'USD' },
	{ alias: 'yen', currency: 'JPY' },
	{ alias: 'えん', currency: 'JPY' },
	{ alias: 'エン', currency: 'JPY' },
	{ alias: '円', currency: 'JPY' },
	{ alias: 'jpy', currency: 'JPY' },
	{ alias: '¥', currency: 'JPY' },
];

const UNIT_ALIASES: ReadonlyArray<{ alias: string; unit: UnitInterpretation['sourceUnit'] }> = [
	{ alias: 'quadrillion', unit: 'Q' },
	{ alias: 'trillion', unit: 'T' },
	{ alias: 'billion', unit: 'B' },
	{ alias: 'million', unit: 'M' },
	{ alias: 'thousand', unit: 'K' },
	{ alias: 'ちょう', unit: '兆' },
	{ alias: 'おく', unit: '億' },
	{ alias: 'まん', unit: '万' },
	{ alias: 'せん', unit: '千' },
	{ alias: '京', unit: '京' },
	{ alias: '兆', unit: '兆' },
	{ alias: '億', unit: '億' },
	{ alias: '万', unit: '万' },
	{ alias: '千', unit: '千' },
	{ alias: 'q', unit: 'Q' },
	{ alias: 't', unit: 'T' },
	{ alias: 'b', unit: 'B' },
	{ alias: 'm', unit: 'M' },
	{ alias: 'k', unit: 'K' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isCurrency(value: unknown): value is Currency {
	return value === 'USD' || value === 'JPY';
}

function removeCurrencyAlias(
	value: string,
	position: 'start' | 'end',
): { value: string; currency?: Currency } {
	const match = CURRENCY_ALIASES.find(candidate => (
		position === 'start' ? value.startsWith(candidate.alias) : value.endsWith(candidate.alias)
	));
	if (!match) return { value };
	return {
		value: position === 'start'
			? value.slice(match.alias.length)
			: value.slice(0, -match.alias.length),
		currency: match.currency,
	};
}

export function parseCurrencyLocally(
	input: string,
	defaultSourceCurrency: Currency,
): CurrencyInterpretation | null {
	const normalized = input.normalize('NFKC').toLowerCase().replace(/[,\s_]/g, '');
	const prefix = removeCurrencyAlias(normalized, 'start');
	const suffix = removeCurrencyAlias(prefix.value, 'end');
	if (prefix.currency && suffix.currency && prefix.currency !== suffix.currency) return null;

	const unitMatch = UNIT_ALIASES.find(candidate => suffix.value.endsWith(candidate.alias));
	const numericPart = unitMatch
		? suffix.value.slice(0, -unitMatch.alias.length)
		: suffix.value;
	const coefficient = unitMatch && numericPart.length === 0 ? '1' : numericPart;
	if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(coefficient)) {
		const value = Number(coefficient);
		if (!Number.isFinite(value)) return null;
		return {
			value,
			sourceUnit: unitMatch?.unit ?? 'none',
			sourceCurrency: prefix.currency ?? suffix.currency ?? defaultSourceCurrency,
		};
	}

	const japaneseValue = parseJapaneseNumber(suffix.value);
	if (japaneseValue === null) return null;
	return {
		value: japaneseValue,
		sourceUnit: 'none',
		sourceCurrency: prefix.currency ?? suffix.currency ?? defaultSourceCurrency,
	};
}

export function parseCurrencyInterpretation(content: string): SakuraCurrencyInterpretation {
	const firstBrace = content.indexOf('{');
	const lastBrace = content.lastIndexOf('}');
	if (firstBrace < 0 || lastBrace <= firstBrace) {
		throw new Error('Sakura AIが通貨表現を解釈できませんでした。表現を変えてお試しください。');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1)) as unknown;
	} catch {
		throw new Error('Sakura AIの応答形式が不正でした。もう一度お試しください。');
	}
	if (!isRecord(parsed)) {
		throw new Error('Sakura AIの応答形式が不正でした。もう一度お試しください。');
	}

	const normalizedInput = parsed['normalizedInput'];
	const sourceAmount = parsed['sourceAmount'];
	const sourceCurrency = parsed['sourceCurrency'];
	const convertedAmount = parsed['convertedAmount'];
	if (
		typeof normalizedInput !== 'string' ||
		normalizedInput.length === 0 ||
		normalizedInput.length > 200 ||
		typeof sourceAmount !== 'number' ||
		!Number.isFinite(sourceAmount) ||
		!isCurrency(sourceCurrency) ||
		typeof convertedAmount !== 'number' ||
		!Number.isFinite(convertedAmount)
	) {
		throw new Error('Sakura AIが返した通貨条件を安全に検証できませんでした。');
	}
	return { normalizedInput, sourceAmount, sourceCurrency, convertedAmount };
}

function extractAssistantContent(raw: unknown): string {
	if (!isRecord(raw) || !Array.isArray(raw['choices']) || raw['choices'].length === 0) {
		throw new Error('Sakura AIから通貨の解釈結果が返りませんでした。');
	}
	const choice = raw['choices'][0];
	if (!isRecord(choice) || !isRecord(choice['message']) || typeof choice['message']['content'] !== 'string') {
		throw new Error('Sakura AIの応答形式が不正でした。');
	}
	return choice['message']['content'];
}

async function interpretCurrencyWithSakura(
	input: string,
	defaultSourceCurrency: Currency,
	exchangeRate: number,
	options: CurrencyConversionOptions,
): Promise<{ interpretation: SakuraCurrencyInterpretation; model: string }> {
	const token = options.token ?? process.env['SAKURA_AI_TOKEN'];
	if (!token) {
		throw new Error('この表現にはSakura AIが必要ですが、トークンが未設定です。READMEの手順で安全に登録してください。');
	}
	const model = options.model ?? process.env['SAKURA_AI_MODEL'] ?? DEFAULT_SAKURA_AI_MODEL;
	const fetchImplementation = options.fetchImplementation ?? fetch;
	const response = await fetchImplementation(SAKURA_AI_ENDPOINT, {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			messages: [
				{
					role: 'system',
					content: 'あなたは通貨額の自然言語を厳密なJSONへ変換するパーサーです。',
				},
				{
					role: 'user',
					content: [
						'次の通貨額を解析し、JSONオブジェクトだけを返してください。',
						'ひらがな、カタカナ、全角、半角、空白、日本語の数値単位を解釈してください。',
						'valueと単位を分離せず、sourceAmountには単位を展開した絶対額を入れてください。',
						'convertedAmountには指定レートで反対通貨へ換算した数値を入れてください。',
						'説明は行わないでください。',
						'スキーマ:',
						'{"normalizedInput":string,"sourceAmount":number,"sourceCurrency":"USD|JPY","convertedAmount":number}',
						`換算レート: 1 USD = ${String(exchangeRate)} JPY`,
						`通貨が省略されている場合の既定値: ${defaultSourceCurrency}`,
						`依頼: ${input}`,
					].join('\n'),
				},
			],
			temperature: 0,
			max_tokens: 150,
			stream: false,
		}),
		signal: AbortSignal.timeout(60_000),
	});

	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw new Error('Sakura AIの認証に失敗しました。トークンを再登録してください。');
		}
		if (response.status === 429) {
			throw new Error('Sakura AIの利用上限に達したか、現在混雑しています。時間を置いてお試しください。');
		}
		throw new Error(`Sakura AIへの接続に失敗しました（HTTP ${String(response.status)}）。`);
	}

	return {
		interpretation: parseCurrencyInterpretation(extractAssistantContent(await response.json() as unknown)),
		model,
	};
}

function calculateConvertedAmount(
	sourceAmount: number,
	sourceCurrency: Currency,
	exchangeRate: number,
): number {
	return sourceCurrency === 'JPY'
		? sourceAmount / exchangeRate
		: sourceAmount * exchangeRate;
}

function assertValidExchangeRate(exchangeRate: number): void {
	if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 1_000) {
		throw new Error('為替レートが不正です。レートを更新してから再度お試しください。');
	}
}

function isApproximatelyEqual(left: number, right: number): boolean {
	const tolerance = Math.max(0.01, Math.abs(right) * 1e-9);
	return Math.abs(left - right) <= tolerance;
}

function verifySakuraInterpretation(
	ai: SakuraCurrencyInterpretation,
	exchangeRate: number,
	local: CurrencyInterpretation | null,
): { interpretation: CurrencyInterpretation; verification: CurrencyVerification } {
	const independentlyConverted = calculateConvertedAmount(
		ai.sourceAmount,
		ai.sourceCurrency,
		exchangeRate,
	);
	if (!isApproximatelyEqual(ai.convertedAmount, independentlyConverted)) {
		throw new Error('Sakura AIの計算結果が独立検算と一致しませんでした。入力を確認してください。');
	}

	if (local) {
		const localAmount = local.value * getUnitMultiplier(local.sourceUnit);
		if (
			local.sourceCurrency !== ai.sourceCurrency ||
			!isApproximatelyEqual(localAmount, ai.sourceAmount)
		) {
			throw new Error('Sakura AIの正規化結果がローカル解析と一致しませんでした。入力を確認してください。');
		}
	}

	return {
		interpretation: {
			value: ai.sourceAmount,
			sourceUnit: 'none',
			sourceCurrency: ai.sourceCurrency,
		},
		verification: {
			normalizedInput: ai.normalizedInput,
			sourceAmount: ai.sourceAmount,
			convertedAmount: independentlyConverted,
			verified: true,
		},
	};
}

function createLocalResult(
	local: CurrencyInterpretation,
	exchangeRate: number,
): CurrencyConversionResult {
	const sourceAmount = local.value * getUnitMultiplier(local.sourceUnit);
	return {
		result: formatCurrencyConversion(local, exchangeRate),
		interpretation: local,
		parser: 'local',
		verification: {
			normalizedInput: `${String(sourceAmount)} ${local.sourceCurrency}`,
			sourceAmount,
			convertedAmount: calculateConvertedAmount(
				sourceAmount,
				local.sourceCurrency,
				exchangeRate,
			),
			verified: true,
		},
	};
}

function formatJapaneseAmount(value: number, suffix: string): string {
	const absolute = Math.abs(value);
	const prefix = value < 0 ? '-' : '';
	const units = [
		{ unit: '京', multiplier: 1e16 },
		{ unit: '兆', multiplier: 1e12 },
		{ unit: '億', multiplier: 1e8 },
		{ unit: '万', multiplier: 1e4 },
	];
	const selected = units.find(unit => absolute >= unit.multiplier);
	if (!selected) return `${prefix}${Math.floor(absolute).toLocaleString('ja-JP')}${suffix}`;
	const short = (absolute / selected.multiplier).toLocaleString('ja-JP', { maximumFractionDigits: 3 });
	return `${prefix}${short}${selected.unit}${suffix}`;
}

function formatJpy(value: number): string {
	const exact = `${Math.floor(value).toLocaleString('ja-JP')}円`;
	const short = formatJapaneseAmount(value, '円');
	return exact === short ? exact : `${exact}（${short}）`;
}

function formatUsd(value: number): string {
	const exact = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	const absolute = Math.abs(value);
	const prefix = value < 0 ? '-' : '';
	const units = [
		{ unit: 'Q', multiplier: 1e15 },
		{ unit: 'T', multiplier: 1e12 },
		{ unit: 'B', multiplier: 1e9 },
		{ unit: 'M', multiplier: 1e6 },
		{ unit: 'K', multiplier: 1e3 },
	];
	const selected = units.find(unit => absolute >= unit.multiplier);
	if (!selected) return exact;
	const short = `${prefix}$${(absolute / selected.multiplier).toLocaleString('en-US', { maximumFractionDigits: 3 })}${selected.unit}`;
	return `${exact}（${short}・${formatJapaneseAmount(value, 'ドル')}）`;
}

export function formatCurrencyConversion(
	interpretation: CurrencyInterpretation,
	exchangeRate: number,
): string {
	assertValidExchangeRate(exchangeRate);
	const sourceAmount = interpretation.value * getUnitMultiplier(interpretation.sourceUnit);
	if (!Number.isFinite(sourceAmount)) {
		throw new Error('変換する金額が大きすぎます。');
	}

	if (interpretation.sourceCurrency === 'JPY') {
		return `${formatUsd(sourceAmount / exchangeRate)}（約${formatJpy(sourceAmount)}）`;
	}

	const jpyValue = sourceAmount * exchangeRate;
	return [
		formatJpy(jpyValue),
		`元の金額: ${formatUsd(sourceAmount)}`,
		`消費税込(10%): ${formatJpy(Math.floor(jpyValue * 1.1))}`,
		`軽減税率(8%): ${formatJpy(Math.floor(jpyValue * 1.08))}`,
	].join('\n');
}

export async function convertCurrency(
	input: string,
	exchangeRate: number,
	defaultSourceCurrency: Currency,
	options: CurrencyConversionOptions = {},
): Promise<CurrencyConversionResult> {
	const trimmedInput = input.trim();
	if (trimmedInput.length === 0) throw new Error('変換したい金額を入力してください。');
	if (trimmedInput.length > MAX_INPUT_LENGTH) {
		throw new Error(`入力は${String(MAX_INPUT_LENGTH)}文字以内にしてください。`);
	}
	assertValidExchangeRate(exchangeRate);

	const local = parseCurrencyLocally(trimmedInput, defaultSourceCurrency);
	const token = options.token ?? process.env['SAKURA_AI_TOKEN'];
	if (!token) {
		if (local) return createLocalResult(local, exchangeRate);
		throw new Error('この表現にはSakura AIが必要ですが、トークンが未設定です。READMEの手順で安全に登録してください。');
	}

	let ai: Awaited<ReturnType<typeof interpretCurrencyWithSakura>>;
	let verified: ReturnType<typeof verifySakuraInterpretation>;
	try {
		ai = await interpretCurrencyWithSakura(trimmedInput, defaultSourceCurrency, exchangeRate, options);
		verified = verifySakuraInterpretation(ai.interpretation, exchangeRate, local);
	} catch (error: unknown) {
		if (local) return createLocalResult(local, exchangeRate);
		throw error;
	}

	return {
		result: formatCurrencyConversion(verified.interpretation, exchangeRate),
		interpretation: verified.interpretation,
		parser: 'sakura-ai',
		verification: verified.verification,
		model: ai.model,
	};
}
