export {};

declare global {
	class TabController {
		private tabs: NodeListOf<HTMLElement>;
		private contents: NodeListOf<HTMLElement>;
		constructor();
		private init(): void;
		switchTab(selectedTab: HTMLElement): void;
	}
}


