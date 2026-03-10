"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatteryComponent = void 0;
class BatteryComponent {
    constructor() {
        this.capacityInput = document.getElementById('battery-capacity');
        this.wattsInput = document.getElementById('charger-watts');
        this.currentInput = document.getElementById('charger-current');
        this.voltageInput = document.getElementById('charger-voltage');
        this.calculateButton = document.getElementById('calculate-charging');
        this.resultBox = document.getElementById('battery-result');
        this.powerModeInputs = document.getElementsByName('power-mode');
        this.wattsInputGroup = document.getElementById('watts-input');
        this.currentVoltageInputGroup = document.getElementById('current-voltage-input');
        this.currentChargeInput = document.getElementById('current-charge');
    }
    init() {
        this.calculateButton.addEventListener('click', () => this.calculateChargingTime());
        this.powerModeInputs.forEach(input => {
            input.addEventListener('change', () => this.toggleInputMode());
        });
    }
    toggleInputMode() {
        const checked = document.querySelector('input[name="power-mode"]:checked');
        const isWattsMode = (checked?.value ?? '') === 'watts';
        this.wattsInputGroup.style.display = isWattsMode ? 'block' : 'none';
        this.currentVoltageInputGroup.style.display = isWattsMode ? 'none' : 'block';
    }
    calculateChargingTime() {
        const capacity = parseFloat(this.capacityInput.value);
        const currentCharge = parseFloat(this.currentChargeInput.value);
        let power = 0;
        const checked = document.querySelector('input[name="power-mode"]:checked');
        const isWattsMode = (checked?.value ?? '') === 'watts';
        if (isWattsMode) {
            power = parseFloat(this.wattsInput.value);
        }
        else {
            const current = parseFloat(this.currentInput.value);
            const voltage = parseFloat(this.voltageInput.value);
            power = current * voltage;
        }
        if (isNaN(capacity) || isNaN(power) || capacity <= 0 || power <= 0 ||
            isNaN(currentCharge) || currentCharge < 0 || currentCharge > 100) {
            this.resultBox.innerHTML = '<p class="error">有効な数値を入力してください！</p>';
            return;
        }
        const efficiency = 0.85; // 充電効率を85%と仮定
        const voltageStd = 5; // 標準 5V
        const currentA = (power * efficiency) / voltageStd;
        const currentCapacity = capacity * (currentCharge / 100);
        const remainingCapacity100 = capacity - currentCapacity;
        const remainingCapacity80 = capacity * 0.8 - currentCapacity;
        const fullChargeTime = remainingCapacity100 / (currentA * 1000);
        const eightyPercentTime = remainingCapacity80 / (currentA * 1000);
        const formatTime = (hours) => {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return `${h}時間${m}分`;
        };
        this.resultBox.innerHTML = `
			<div class="result-content">
				<p>⚡ ${currentCharge}% → 100%までの時間: ${formatTime(fullChargeTime)}</p>
				<p>⚡ ${currentCharge}% → 80%までの時間: ${formatTime(eightyPercentTime)}</p>
				<p class="note">※充電効率は85%と仮定しての計算です</p>
			</div>
		`;
    }
}
exports.BatteryComponent = BatteryComponent;
// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.BatteryComponent = BatteryComponent;
