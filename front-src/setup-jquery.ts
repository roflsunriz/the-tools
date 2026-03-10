import jQuery from 'jquery';

declare global {
	interface JQueryWindowShim {
		$: JQueryStatic;
		jQuery: JQueryStatic;
	}
}

(globalThis as unknown as JQueryWindowShim).$ = jQuery;
(globalThis as unknown as JQueryWindowShim).jQuery = jQuery;


