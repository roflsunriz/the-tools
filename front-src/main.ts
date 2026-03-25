import './style.css';
import './setup-jquery.ts';

// npm版 bootstrap をnode_modulesから読み込む
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// npm版 clockpicker のCSSのみ先に読み込み（JSは動的importで順序保証）
import 'clockpicker/dist/bootstrap-clockpicker.min.css';
// Vite のアセットとして clockpicker の UMD を参照（型定義なし）
// @ts-expect-error 型定義が無いため無視
import clockpickerJsUrl from 'clockpicker/dist/jquery-clockpicker.min.js?url';

type ClockpickerAwareGlobal = typeof globalThis & {
	jQuery?: {
		fn?: {
			clockpicker?: unknown;
		};
	};
};

// clockpicker を後でロードするための関数
function loadClockpicker(): Promise<void> {
	return new Promise((resolve, reject) => {
		const s = document.createElement('script');
		s.src = clockpickerJsUrl;
		s.async = true;
		s.onload = () => {
			// jQuery プラグインが登録されたか軽く検証
			const clockpickerReadyGlobal = globalThis as ClockpickerAwareGlobal;
			if (typeof clockpickerReadyGlobal.jQuery?.fn?.clockpicker === 'function') {
				resolve();
			} else {
				resolve();
			}
		};
		s.onerror = () => reject(new Error('clockpicker load failed'));
		document.head.appendChild(s);
	});
}

 

// アプリのクラスを静的 import（コード分割を避け確実に読み込む）
import { TabController } from './components/TabController.ts';
import { ConverterComponent } from './components/ConverterComponent.ts';
import { ExchangeComponent } from './components/ExchangeComponent.ts';
import { NicoIdComponent } from './components/NicoIdComponent.ts';
import { TimezoneComponent } from './components/TimezoneComponent.ts';
import { BatteryComponent } from './components/BatteryComponent.ts';
import { StoveComponent } from './components/StoveComponent.ts';
import { AlarmComponent } from './components/AlarmComponent.ts';
import { MiniJsonComponent } from './components/MiniJsonComponent.ts';
import { KakakuPriceComponent } from './components/KakakuPriceComponent.ts';

const bootstrap = () => {
	console.log('[boot] start');
	new TabController();
	const converter = new ConverterComponent();
	const exchange = new ExchangeComponent();
	const nico = new NicoIdComponent();
	const timezone = new TimezoneComponent();
	const battery = new BatteryComponent();
	const stove = new StoveComponent();
	const alarm = new AlarmComponent();
	const miniJson = new MiniJsonComponent();
	const kakakuPrice = new KakakuPriceComponent();

	converter.init();
	exchange.init();
	nico.init();
	timezone.init();
	battery.init();
	stove.init();
	alarm.init();
	miniJson.init();
	kakakuPrice.init();
	console.log('[boot] initialized');
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', async () => {
		await loadClockpicker();
		bootstrap();
	});
} else {
	(async () => {
		await loadClockpicker();
		bootstrap();
	})();
}
