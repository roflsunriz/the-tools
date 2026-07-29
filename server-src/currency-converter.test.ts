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

test('曖昧な自然文だけSakura AIで解釈する', async () => {
	const mockFetch: typeof fetch = () => Promise.resolve(new Response(JSON.stringify({
		choices: [{
			message: {
				content: '{"value":400,"sourceUnit":"億","sourceCurrency":"USD"}',
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
});

test('Sakura AIの通貨スキーマ外応答を拒否する', () => {
	assert.throws(
		() => parseCurrencyInterpretation('{"value":400,"sourceUnit":"億","sourceCurrency":"EUR"}'),
		/安全に検証/,
	);
});
