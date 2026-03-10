export class TabController {
	private tabs: NodeListOf<HTMLElement>;
	private contents: NodeListOf<HTMLElement>;

	constructor() {
		this.tabs = document.querySelectorAll<HTMLElement>('.tab-button');
		this.contents = document.querySelectorAll<HTMLElement>('.tab-content');
		this.init();
	}

	private init(): void {
		const savedTab = localStorage.getItem('selectedTab');
		if (savedTab) {
			const tabToActivate = Array.from(this.tabs).find(
				tab => (tab.dataset as DOMStringMap).tab === savedTab
			);
			if (tabToActivate) {
				this.switchTab(tabToActivate);
			}
		}

		this.tabs.forEach(tab => {
			tab.addEventListener('click', () => this.switchTab(tab));
		});
	}

	public switchTab(selectedTab: HTMLElement): void {
		this.tabs.forEach(tab => {
			tab.classList.remove('active');
		});
		selectedTab.classList.add('active');

		const targetId = `${(selectedTab.dataset as DOMStringMap).tab}-tab`;
		this.contents.forEach(content => {
			content.classList.remove('active');
			if (content.id === targetId) {
				content.classList.add('active');
			}
		});

		localStorage.setItem('selectedTab', (selectedTab.dataset as DOMStringMap).tab ?? '');
	}
}

// グローバルに公開（既存の app.js がグローバル参照しているため）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).TabController = TabController;


