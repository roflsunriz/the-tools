import assert from 'node:assert/strict';
import test from 'node:test';
import {
	convertCurrency,
	formatCurrencyConversion,
	parseCurrencyInterpretation,
	parseCurrencyLocally,
} from './currency-converter';

test('「400おくどる」を400億ドルとしてローカル解釈する', () => {
	assert.deepEqual(parseCurrencyLocally('400おくどる', 'JPY'), {
		value: 400,
		sourceUnit: '億',
		sourceCurrency: 'USD',
	});
});

test('全角、空白、英語単位を正規化する', () => {
	assert.deepEqual(parseCurrencyLocally('ＵＳＤ ２．５ Ｂ', 'JPY'), {
		value: 2.5,
		sourceUnit: 'B',
		sourceCurrency: 'USD',
	});
});

test('数値を省略した日本語単位を係数1としてローカル解釈する', () => {
	for (const input of ['せんえん', '千円']) {
		assert.deepEqual(parseCurrencyLocally(input, 'USD'), {
			value: 1,
			sourceUnit: '千',
			sourceCurrency: 'JPY',
		});
	}
	assert.deepEqual(parseCurrencyLocally('おくどる', 'JPY'), {
		value: 1,
		sourceUnit: '億',
		sourceCurrency: 'USD',
	});
});

test('日本語数詞を列挙ではなく桁構造でローカル解釈する', () => {
	const cases: ReadonlyArray<readonly [string, number]> = [
		['いちまんえん', 10_000],
		['にまんえん', 20_000],
		['十二万三千四百五十六円', 123_456],
		['イチオクニセンマンエン', 120_000_000],
		['壱萬弐阡参佰四拾五円', 12_345],
	];

	for (const [input, value] of cases) {
		assert.deepEqual(parseCurrencyLocally(input, 'USD'), {
			value,
			sourceUnit: 'none',
			sourceCurrency: 'JPY',
		}, input);
	}
});

test('400億ドルを円へ確定的に換算する', () => {
	const result = formatCurrencyConversion({
		value: 400,
		sourceUnit: '億',
		sourceCurrency: 'USD',
	}, 150);

	assert.match(result, /^6,000,000,000,000円（6兆円）/);
	assert.match(result, /\$40,000,000,000\.00（\$40B・400億ドル）/);
});

test('一般表記はトークンなしでも外部通信せず変換する', async () => {
	let called = false;
	const mockFetch: typeof fetch = () => {
		called = true;
		return Promise.reject(new Error('呼ばれてはいけません'));
	};

	const result = await convertCurrency('400おくどる', 150, 'JPY', {
		token: '',
		fetchImplementation: mockFetch,
	});

	assert.equal(result.parser, 'local');
	assert.equal(called, false);
});

test('「せんえん」と「千円」はトークンなしで1000円として換算する', async () => {
	let called = false;
	const mockFetch: typeof fetch = () => {
		called = true;
		return Promise.reject(new Error('呼ばれてはいけません'));
	};

	for (const input of ['せんえん', '千円']) {
		const result = await convertCurrency(input, 150, 'USD', {
			token: '',
			fetchImplementation: mockFetch,
		});

		assert.equal(result.parser, 'local');
		assert.equal(result.result, '$6.67（約1,000円）');
	}
	assert.equal(called, false);
});

test('日本語数詞の通貨表現はトークンなしで外部通信せず換算する', async () => {
	let called = false;
	const mockFetch: typeof fetch = () => {
		called = true;
		return Promise.reject(new Error('呼ばれてはいけません'));
	};

	const cases: ReadonlyArray<readonly [string, string]> = [
		['いちまんえん', '$66.67（約10,000円（1万円））'],
		['にまんえん', '$133.33（約20,000円（2万円））'],
		['十二万三千四百五十六円', '$823.04（約123,456円（12.346万円））'],
	];
	for (const [input, expected] of cases) {
		const result = await convertCurrency(input, 150, 'USD', {
			token: '',
			fetchImplementation: mockFetch,
		});
		assert.equal(result.parser, 'local');
		assert.equal(result.result, expected);
	}
	assert.equal(called, false);
});

test('曖昧な自然文だけSakura AIで解釈する', async () => {
	const mockFetch: typeof fetch = () => Promise.resolve(new Response(JSON.stringify({
		choices: [{
			message: {
				content: '{"normalizedInput":"400億 USD","sourceAmount":40000000000,"sourceCurrency":"USD","convertedAmount":6000000000000}',
			},
		}],
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	}));

	const result = await convertCurrency('四百億米ドルを円に', 150, 'JPY', {
		token: 'test-token',
		model: 'test-model',
		fetchImplementation: mockFetch,
	});

	assert.equal(result.parser, 'sakura-ai');
	assert.match(result.result, /^6,000,000,000,000円/);
	assert.equal(result.verification.verified, true);
});

test('トークン設定時はLLMの正規化結果を先に独立検算する', async () => {
	let called = false;
	const mockFetch: typeof fetch = () => {
		called = true;
		return Promise.resolve(new Response(JSON.stringify({
			choices: [{
				message: {
					content: '{"normalizedInput":"10000 JPY","sourceAmount":10000,"sourceCurrency":"JPY","convertedAmount":66.6666666667}',
				},
			}],
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		}));
	};

	const result = await convertCurrency('いちまんえん', 150, 'USD', {
		token: 'test-token',
		model: 'test-model',
		fetchImplementation: mockFetch,
	});

	assert.equal(called, true);
	assert.equal(result.parser, 'sakura-ai');
	assert.equal(result.verification.normalizedInput, '10000 JPY');
	assert.equal(result.verification.sourceAmount, 10_000);
	assert.equal(result.verification.convertedAmount, 10_000 / 150);
	assert.equal(result.result, '$66.67（約10,000円（1万円））');
});

test('LLMの正規化または計算が一致しない場合は検算済みローカル結果へ退避する', async () => {
	const invalidResponses = [
		'{"normalizedInput":"100000000 JPY","sourceAmount":100000000,"sourceCurrency":"JPY","convertedAmount":666666.6666667}',
		'{"normalizedInput":"10000 JPY","sourceAmount":10000,"sourceCurrency":"JPY","convertedAmount":666666.6666667}',
	];

	for (const content of invalidResponses) {
		const mockFetch: typeof fetch = () => Promise.resolve(new Response(JSON.stringify({
			choices: [{ message: { content } }],
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		}));

		const result = await convertCurrency('いちまんえん', 150, 'USD', {
			token: 'test-token',
			model: 'test-model',
			fetchImplementation: mockFetch,
		});

		assert.equal(result.parser, 'local');
		assert.equal(result.verification.sourceAmount, 10_000);
		assert.equal(result.result, '$66.67（約10,000円（1万円））');
	}
});

test('ローカル解析不能な入力ではLLMの計算不一致を拒否する', async () => {
	const mockFetch: typeof fetch = () => Promise.resolve(new Response(JSON.stringify({
		choices: [{
			message: {
				content: '{"normalizedInput":"400億 USD","sourceAmount":40000000000,"sourceCurrency":"USD","convertedAmount":1}',
			},
		}],
	}), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	}));

	await assert.rejects(
		convertCurrency('四百億米ドルを円に', 150, 'JPY', {
			token: 'test-token',
			model: 'test-model',
			fetchImplementation: mockFetch,
		}),
		/独立検算と一致しません/,
	);
});

test('不正な為替レートではLLMへ送信しない', async () => {
	let called = false;
	const mockFetch: typeof fetch = () => {
		called = true;
		return Promise.reject(new Error('呼ばれてはいけません'));
	};

	await assert.rejects(
		convertCurrency('いちまんえん', 0, 'JPY', {
			token: 'test-token',
			fetchImplementation: mockFetch,
		}),
		/為替レートが不正/,
	);
	assert.equal(called, false);
});

test('Sakura AIの通貨スキーマ外応答を拒否する', () => {
	assert.throws(
		() => parseCurrencyInterpretation('{"normalizedInput":"400億 EUR","sourceAmount":40000000000,"sourceCurrency":"EUR","convertedAmount":6000000000000}'),
		/安全に検証/,
	);
});
