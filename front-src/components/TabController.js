"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabController = void 0;
class TabController {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-button');
        this.contents = document.querySelectorAll('.tab-content');
        this.init();
    }
    init() {
        const savedTab = localStorage.getItem('selectedTab');
        if (savedTab) {
            const tabToActivate = Array.from(this.tabs).find(tab => tab.dataset.tab === savedTab);
            if (tabToActivate) {
                this.switchTab(tabToActivate);
            }
        }
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });
    }
    switchTab(selectedTab) {
        this.tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        selectedTab.classList.add('active');
        const targetId = `${selectedTab.dataset.tab}-tab`;
        this.contents.forEach(content => {
            content.classList.remove('active');
            if (content.id === targetId) {
                content.classList.add('active');
            }
        });
        localStorage.setItem('selectedTab', selectedTab.dataset.tab ?? '');
    }
}
exports.TabController = TabController;
// グローバルに公開（既存の app.js がグローバル参照しているため）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.TabController = TabController;
