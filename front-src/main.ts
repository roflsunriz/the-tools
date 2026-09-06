import './style.css';

// 依存パッケージ版 bootstrap を node_modules から読み込む
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// 時刻ピッカー（timepicker-ui）のスタイル読み込み
import 'timepicker-ui/main.css';

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
import { CodexResetComponent } from './components/CodexResetComponent.ts';

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
	const codexReset = new CodexResetComponent();

	converter.init();
	exchange.init();
	nico.init();
	timezone.init();
	battery.init();
	stove.init();
	alarm.init();
	miniJson.init();
	kakakuPrice.init();
	codexReset.init();
	console.log('[boot] initialized');
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		bootstrap();
	});
} else {
	bootstrap();
}
