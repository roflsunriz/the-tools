import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 65505; // 8080と8081は使えないので65505番を使うのじゃ

// 静的ファイルを提供する
// 優先度: <project>/frontend-dist（必ずここを使う） > <dist> > <project root>
const candidates = [
	path.join(__dirname, '..', 'frontend-dist'), // 常にここを優先して配信する
	__dirname,                                   // dist
	path.join(__dirname, '..')                   // プロジェクトルート（開発時）
];
const rootDir = candidates.find(p => fs.existsSync(path.join(p, 'index.html')));
// 存在しない場合はフォールバックとしてプロジェクトルートを使う
const staticRoot = rootDir || path.join(__dirname, '..');
app.use(express.static(staticRoot));
// プロジェクト直下の js 資産も配信（Vite 出力配下に無い UMD 用など）
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
// ビルド済みフロントエンドのアセットを優先的に配信（開発時も `/assets/*` を解決できるようにする）
const builtAssetsDir = path.join(__dirname, '..', 'frontend-dist', 'assets');
if (fs.existsSync(builtAssetsDir)) {
	app.use('/assets', express.static(builtAssetsDir));
}

// ルートへのアクセス — 常に `frontend-dist/index.html` を返す（存在しなければ見つかった最初の index.html）
app.get('/', (_req, res) => {
	const prefer = path.join(__dirname, '..', 'frontend-dist', 'front-src','index.html');
	if (fs.existsSync(prefer)) {
		res.sendFile(prefer);
		return;
	}
	// frontend-dist/index.html が無ければ先に見つかった index.html を返す
	const fallbackIndex = path.join(staticRoot, 'index.html');
	res.sendFile(fallbackIndex);
});

// サーバー起動
app.listen(PORT, () => {
	console.log(`七瀬の魔法ツールボックスが http://localhost:${PORT}/ で動いておるぞい！`);
});


