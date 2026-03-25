export {};
declare global {
	var TabController: any;
	var ConverterComponent: any;
	var ExchangeComponent: any;
	var NicoIdComponent: any;
	var TimezoneComponent: any;
	var BatteryComponent: any;
	var StoveComponent: any;
	var AlarmComponent: any;
	var KakakuPriceComponent: any;
	var $: JQueryStatic;
	var jQuery: JQueryStatic;
}

declare module 'clockpicker/dist/jquery-clockpicker.min.js' {
  const mod: unknown;
  export default mod;
}
declare module 'clockpicker/dist/jquery-clockpicker.min.js?url' {
  const url: string;
  export default url;
}


