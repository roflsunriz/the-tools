import assert from 'node:assert/strict';
import test from 'node:test';
import {
	clearSakuraModelCacheForTests,
	isSakuraChatModel,
	resolveSakuraModel,
	selectSakuraChatModel,
} from './sakura-models';

test('音声・埋め込みモデルをチャット候補から除外する', () => {
	assert.equal(isSakuraChatModel('whisper-large-v3-turbo'), false);
	assert.equal(isSakuraChatModel('preview/Qwen3-Embedding-4B-FP16'), false);
	assert.equal(isSakuraChatModel('multilingual-e5-large'), false);
	assert.equal(isSakuraChatModel('preview/Qwen3.6-35B-A3B'), true);
});

test('API配列順に依存せず軽量チャットモデルを選ぶ', () => {
	const forward = [
		{ id: 'gpt-oss-120b', created: 20 },
		{ id: 'preview/Qwen3-Embedding-4B-FP16', created: 30 },
		{ id: 'preview/Qwen3-0.6B-cpu', created: 10 },
	];
	assert.equal(selectSakuraChatModel(forward), 'preview/Qwen3-0.6B-cpu');
	assert.equal(selectSakuraChatModel([...forward].reverse()), 'preview/Qwen3-0.6B-cpu');
});

test('固定モデル未指定時に認証付き一覧APIからモデルを解決する', async () => {
	clearSakuraModelCacheForTests();
	let authorization = '';
	const mockFetch: typeof fetch = (_input, init) => {
		authorization = new Headers(init?.headers).get('Authorization') ?? '';
		return Promise.resolve(new Response(JSON.stringify({
			object: 'list',
			data: [
				{ id: 'whisper-large-v3-turbo', object: 'model', created: 30, owned_by: 'sakura' },
				{ id: 'new-general-model', object: 'model', created: 20, owned_by: 'sakura' },
			],
		}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
	};

	assert.equal(await resolveSakuraModel('test-token', undefined, mockFetch), 'new-general-model');
	assert.equal(authorization, 'Bearer test-token');
});

test('明示モデルは一覧取得せずそのまま尊重する', async () => {
	let called = false;
	const mockFetch: typeof fetch = () => {
		called = true;
		return Promise.reject(new Error('呼ばれてはいけません'));
	};

	assert.equal(await resolveSakuraModel('test-token', 'closed/custom-model', mockFetch), 'closed/custom-model');
	assert.equal(called, false);
});
