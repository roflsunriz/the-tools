import assert from 'node:assert/strict';
import test from 'node:test';
import {
	convertUnitWithSakura,
	formatUnitConversion,
	parseUnitInterpretation,
} from './unit-converter';

test('英語単位を日本語単位へ確定的に変換する', () => {
	const result = formatUnitConversion({
		value: 1.5,
		sourceUnit: 'B',
		targetUnit: 'auto-ja',
		precision: 3,
		includeExact: false,
		label: 'パラメーター',
	});

	assert.equal(result, '15億パラメーター');
});

test('指定された単位と総数を表示する', () => {
	const result = formatUnitConversion({
		value: 1.2,
		sourceUnit: '兆',
		targetUnit: 'B',
		precision: 1,
		includeExact: true,
		label: '',
	});

	assert.equal(result, '1,200B（全体: 1,200,000,000,000）');
});

test('コードフェンスを含むJSON応答を検証して読み取る', () => {
	const result = parseUnitInterpretation('```json\n{"value":2.5,"sourceUnit":"M","targetUnit":"万","precision":2,"includeExact":false,"label":"件"}\n```');

	assert.deepEqual(result, {
		value: 2.5,
		sourceUnit: 'M',
		targetUnit: '万',
		precision: 2,
		includeExact: false,
		label: '件',
	});
});

test('スキーマ外の単位を拒否する', () => {
	assert.throws(
		() => parseUnitInterpretation('{"value":1,"sourceUnit":"GB","targetUnit":"MB","precision":2,"includeExact":false,"label":""}'),
		/安全に検証/,
	);
});

test('トークンをAuthorizationヘッダーだけに設定してSakura AIを呼び出す', async () => {
	let capturedAuthorization = '';
	const mockFetch: typeof fetch = (_input, init) => {
		const headers = new Headers(init?.headers);
		capturedAuthorization = headers.get('Authorization') ?? '';
		return Promise.resolve(new Response(JSON.stringify({
			choices: [{
				message: {
					content: '{"value":2,"sourceUnit":"M","targetUnit":"auto-ja","precision":3,"includeExact":false,"label":""}',
				},
			}],
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		}));
	};

	const result = await convertUnitWithSakura('２Ｍを日本語で', {
		token: 'test-token',
		model: 'test-model',
		fetchImplementation: mockFetch,
	});

	assert.equal(capturedAuthorization, 'Bearer test-token');
	assert.equal(result.result, '200万');
	assert.equal(result.model, 'test-model');
});

test('トークンがない場合は外部通信せず設定不足を返す', async () => {
	let called = false;
	const mockFetch: typeof fetch = () => {
		called = true;
		return Promise.reject(new Error('呼ばれてはいけません'));
	};

	await assert.rejects(
		convertUnitWithSakura('1M', {
			token: '',
			fetchImplementation: mockFetch,
		}),
		/トークンが未設定/,
	);
	assert.equal(called, false);
});
