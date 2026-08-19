export const SAKURA_AI_CHAT_ENDPOINT = 'https://api.ai.sakura.ad.jp/v1/chat/completions';
const SAKURA_AI_MODELS_ENDPOINT = 'https://api.ai.sakura.ad.jp/v1/models';
const MODEL_CACHE_TTL_MS = 10 * 60 * 1_000;

interface SakuraModel {
	id: string;
	created: number;
}

let cachedCatalog: { models: SakuraModel[]; expiresAt: number } | undefined;
let pendingCatalog: Promise<SakuraModel[]> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isSakuraChatModel(modelId: string): boolean {
	return !/(?:^|[/_\-.])(embedding|embed|whisper|speech|tts|voice|e5)(?:$|[/_\-.])/i.test(modelId);
}

function modelPriority(modelId: string): number {
	if (modelId === 'preview/Qwen3-0.6B-cpu') return 0;
	if (/(?:cpu|mini|small|0\.6b)/i.test(modelId)) return 1;
	if (/(?:llm-jp|plamo|cotomi)/i.test(modelId)) return 2;
	if (/gpt-oss/i.test(modelId)) return 3;
	if (/(?:coder|code)/i.test(modelId)) return 6;
	if (/(?:^|[/_\-.])(?:vl|vision)(?:$|[/_\-.])/i.test(modelId)) return 5;
	return 4;
}

export function selectSakuraChatModel(models: ReadonlyArray<SakuraModel>): string {
	const candidates = models
		.filter(model => isSakuraChatModel(model.id));
	candidates.sort((left, right) => (
		modelPriority(left.id) - modelPriority(right.id)
		|| right.created - left.created
		|| left.id.localeCompare(right.id, 'en')
	));
	const selected = candidates[0];
	if (!selected) {
		throw new Error('Sakura AIのモデル一覧に利用可能なチャットモデルがありません。');
	}
	return selected.id;
}

function parseCatalog(raw: unknown): SakuraModel[] {
	if (!isRecord(raw) || !Array.isArray(raw['data'])) {
		throw new Error('Sakura AIのモデル一覧の形式が不正です。');
	}

	const models: SakuraModel[] = [];
	for (const item of raw['data']) {
		if (!isRecord(item) || typeof item['id'] !== 'string' || item['id'].trim().length === 0) continue;
		models.push({
			id: item['id'].trim(),
			created: typeof item['created'] === 'number' && Number.isFinite(item['created'])
				? item['created']
				: 0,
		});
	}
	if (models.length === 0) {
		throw new Error('Sakura AIのモデル一覧が空です。');
	}
	return models;
}

async function requestCatalog(token: string, fetchImplementation: typeof fetch): Promise<SakuraModel[]> {
	const response = await fetchImplementation(SAKURA_AI_MODELS_ENDPOINT, {
		method: 'GET',
		headers: {
			'Accept': 'application/json',
			'Authorization': `Bearer ${token}`,
		},
		signal: AbortSignal.timeout(15_000),
	});
	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw new Error('Sakura AIのモデル一覧を取得できませんでした。トークンを再登録してください。');
		}
		throw new Error(`Sakura AIのモデル一覧を取得できませんでした（HTTP ${String(response.status)}）。`);
	}
	return parseCatalog(await response.json() as unknown);
}

async function getCatalog(token: string, fetchImplementation: typeof fetch): Promise<SakuraModel[]> {
	const now = Date.now();
	if (cachedCatalog && cachedCatalog.expiresAt > now) return cachedCatalog.models;
	if (pendingCatalog) return pendingCatalog;

	pendingCatalog = requestCatalog(token, fetchImplementation);
	try {
		const models = await pendingCatalog;
		cachedCatalog = { models, expiresAt: now + MODEL_CACHE_TTL_MS };
		return models;
	} finally {
		pendingCatalog = undefined;
	}
}

export async function resolveSakuraModel(
	token: string,
	requestedModel: string | undefined,
	fetchImplementation: typeof fetch,
): Promise<string> {
	const configuredModel = requestedModel?.trim() || process.env['SAKURA_AI_MODEL']?.trim();
	if (configuredModel) return configuredModel;
	return selectSakuraChatModel(await getCatalog(token, fetchImplementation));
}

export function clearSakuraModelCacheForTests(): void {
	cachedCatalog = undefined;
	pendingCatalog = undefined;
}
