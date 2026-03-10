"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./style.css");
require("./setup-jquery.ts");
// npm版 bootstrap をnode_modulesから読み込む
require("bootstrap/dist/css/bootstrap.min.css");
require("bootstrap/dist/js/bootstrap.bundle.min.js");
// npm版 clockpicker のCSSのみ先に読み込み（JSは動的importで順序保証）
require("clockpicker/dist/bootstrap-clockpicker.min.css");
// Vite のアセットとして clockpicker の UMD を参照（型定義なし）
// @ts-expect-error 型定義が無いため無視
const jquery_clockpicker_min_js_url_1 = __importDefault(require("clockpicker/dist/jquery-clockpicker.min.js?url"));
// clockpicker を後でロードするための関数
function loadClockpicker() {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = jquery_clockpicker_min_js_url_1.default;
        s.async = true;
        s.onload = () => {
            // jQuery プラグインが登録されたか軽く検証
            const clockpickerReadyGlobal = globalThis;
            if (typeof clockpickerReadyGlobal.jQuery?.fn?.clockpicker === 'function') {
                resolve();
            }
            else {
                resolve();
            }
        };
        s.onerror = () => reject(new Error('clockpicker load failed'));
        document.head.appendChild(s);
    });
}
// アプリのクラスを静的 import（コード分割を避け確実に読み込む）
const TabController_ts_1 = require("./components/TabController.ts");
const ConverterComponent_ts_1 = require("./components/ConverterComponent.ts");
const ExchangeComponent_ts_1 = require("./components/ExchangeComponent.ts");
const NicoIdComponent_ts_1 = require("./components/NicoIdComponent.ts");
const TimezoneComponent_ts_1 = require("./components/TimezoneComponent.ts");
const BatteryComponent_ts_1 = require("./components/BatteryComponent.ts");
const StoveComponent_ts_1 = require("./components/StoveComponent.ts");
const AlarmComponent_ts_1 = require("./components/AlarmComponent.ts");
const MiniJsonComponent_ts_1 = require("./components/MiniJsonComponent.ts");
const bootstrap = () => {
    console.log('[boot] start');
    new TabController_ts_1.TabController();
    const converter = new ConverterComponent_ts_1.ConverterComponent();
    const exchange = new ExchangeComponent_ts_1.ExchangeComponent();
    const nico = new NicoIdComponent_ts_1.NicoIdComponent();
    const timezone = new TimezoneComponent_ts_1.TimezoneComponent();
    const battery = new BatteryComponent_ts_1.BatteryComponent();
    const stove = new StoveComponent_ts_1.StoveComponent();
    const alarm = new AlarmComponent_ts_1.AlarmComponent();
    const miniJson = new MiniJsonComponent_ts_1.MiniJsonComponent();
    converter.init();
    exchange.init();
    nico.init();
    timezone.init();
    battery.init();
    stove.init();
    alarm.init();
    miniJson.init();
    console.log('[boot] initialized');
};
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await loadClockpicker();
        bootstrap();
    });
}
else {
    (async () => {
        await loadClockpicker();
        bootstrap();
    })();
}
