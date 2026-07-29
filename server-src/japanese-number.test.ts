import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJapaneseNumber } from './japanese-number';

test('ひらがなの日本語数詞を桁構造として解析する', () => {
	const cases: ReadonlyArray<readonly [string, number]> = [
		['いちまん', 10_000],
		['にまん', 20_000],
		['じゅうにまんさんぜんよんひゃくごじゅうろく', 123_456],
		['いちおくにせんさんびゃくよんじゅうごまんろくせんななひゃくはちじゅうきゅう', 123_456_789],
		['ろっぴゃく', 600],
		['はっせん', 8_000],
		['いってんごまん', 15_000],
		['にじゅうてんご', 20.5],
	];

	for (const [input, expected] of cases) {
		assert.equal(parseJapaneseNumber(input), expected, input);
	}
});

test('漢数字、カタカナ、大字、算用数字の混在を解析する', () => {
	const cases: ReadonlyArray<readonly [string, number]> = [
		['十二万三千四百五十六', 123_456],
		['イチマンニセン', 12_000],
		['壱萬弐阡参佰四拾五', 12_345],
		['2万3000', 23_000],
		['400おく', 40_000_000_000],
		['-にまん', -20_000],
	];

	for (const [input, expected] of cases) {
		assert.equal(parseJapaneseNumber(input), expected, input);
	}
});

test('単位順が不正または数詞以外を含む入力を拒否する', () => {
	for (const input of ['まんおく', '一億万', '十百', 'いちまんです', '1.2.3万', '']) {
		assert.equal(parseJapaneseNumber(input), null, input);
	}
});
