const SPOKEN_TOKENS: ReadonlyArray<readonly [string, string]> = [
	['きゅう', '9'],
	['じゅう', '十'],
	['ひゃく', '百'],
	['びゃく', '百'],
	['ぴゃく', '百'],
	['ちょう', '兆'],
	['れい', '0'],
	['ぜろ', '0'],
	['いち', '1'],
	['さん', '3'],
	['よん', '4'],
	['ろく', '6'],
	['なな', '7'],
	['しち', '7'],
	['はち', '8'],
	['せん', '千'],
	['まん', '万'],
	['おく', '億'],
	['いっ', '1'],
	['ろっ', '6'],
	['はっ', '8'],
	['てん', '.'],
	['に', '2'],
	['し', '4'],
	['ご', '5'],
	['く', '9'],
	['ぜん', '千'],
	['けい', '京'],
];

const KANJI_TOKENS: Readonly<Record<string, string>> = {
	'零': '0',
	'〇': '0',
	'一': '1',
	'壱': '1',
	'二': '2',
	'弐': '2',
	'三': '3',
	'参': '3',
	'四': '4',
	'五': '5',
	'六': '6',
	'七': '7',
	'八': '8',
	'九': '9',
	'十': '十',
	'拾': '十',
	'百': '百',
	'佰': '百',
	'陌': '百',
	'千': '千',
	'仟': '千',
	'阡': '千',
	'万': '万',
	'萬': '万',
	'億': '億',
	'兆': '兆',
	'京': '京',
	'点': '.',
	'・': '.',
};

const SMALL_UNITS: Readonly<Record<string, number>> = {
	'十': 10,
	'百': 100,
	'千': 1_000,
};

const LARGE_UNITS: Readonly<Record<string, number>> = {
	'万': 10_000,
	'億': 100_000_000,
	'兆': 1_000_000_000_000,
	'京': 10_000_000_000_000_000,
};

function katakanaToHiragana(value: string): string {
	return value.replace(/[ァ-ヶ]/g, character => (
		String.fromCharCode(character.charCodeAt(0) - 0x60)
	));
}

function canonicalizeJapaneseNumber(value: string): string | null {
	const normalized = katakanaToHiragana(value.normalize('NFKC').toLowerCase());
	let result = '';
	let position = 0;

	while (position < normalized.length) {
		const character = normalized[position] ?? '';
		if (/[\d.+-]/.test(character)) {
			result += character;
			position += 1;
			continue;
		}

		const kanji = KANJI_TOKENS[character];
		if (kanji) {
			result += kanji;
			position += 1;
			continue;
		}

		const spoken = SPOKEN_TOKENS.find(([token]) => normalized.startsWith(token, position));
		if (!spoken) return null;
		result += spoken[1];
		position += spoken[0].length;
	}

	return result;
}

function parsePlainDigits(value: string): number | null {
	if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseSection(value: string): number | null {
	if (value.length === 0) return 0;
	const plain = parsePlainDigits(value);
	if (plain !== null) return plain;

	let total = 0;
	let digits = '';
	let previousMultiplier = Number.POSITIVE_INFINITY;
	for (const character of value) {
		if (/\d/.test(character) || character === '.') {
			digits += character;
			continue;
		}

		const multiplier = SMALL_UNITS[character];
		if (!multiplier || multiplier >= previousMultiplier) return null;
		const coefficient = digits.length === 0 ? 1 : parsePlainDigits(digits);
		if (coefficient === null) return null;
		total += coefficient * multiplier;
		digits = '';
		previousMultiplier = multiplier;
	}

	if (digits.length > 0) {
		const remainder = parsePlainDigits(digits);
		if (remainder === null) return null;
		total += remainder;
	}
	return total;
}

export function parseJapaneseNumber(value: string): number | null {
	const canonical = canonicalizeJapaneseNumber(value);
	if (!canonical) return null;

	const sign = canonical.startsWith('-') ? -1 : 1;
	const unsigned = canonical.startsWith('-') || canonical.startsWith('+')
		? canonical.slice(1)
		: canonical;
	if (unsigned.length === 0 || /[+-]/.test(unsigned)) return null;

	const plain = parsePlainDigits(unsigned);
	if (plain !== null) return sign * plain;

	let total = 0;
	let sectionStart = 0;
	let previousMultiplier = Number.POSITIVE_INFINITY;
	for (let index = 0; index < unsigned.length; index += 1) {
		const character = unsigned[index] ?? '';
		const multiplier = LARGE_UNITS[character];
		if (!multiplier) continue;
		if (multiplier >= previousMultiplier) return null;

		const sectionText = unsigned.slice(sectionStart, index);
		if (sectionText.length === 0 && sectionStart > 0) return null;
		const section = sectionText.length === 0 ? 1 : parseSection(sectionText);
		if (section === null) return null;
		total += section * multiplier;
		sectionStart = index + 1;
		previousMultiplier = multiplier;
	}

	const remainderText = unsigned.slice(sectionStart);
	const remainder = remainderText.length === 0 ? 0 : parseSection(remainderText);
	if (remainder === null) return null;
	const result = sign * (total + remainder);
	return Number.isFinite(result) ? result : null;
}
