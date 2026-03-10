"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoveComponent = void 0;
class StoveComponent {
    constructor() {
        this.container = document.getElementById('stove-tab');
        this.fuelTypes = {
            '灯油': { density: 0.8, calorificValue: 36.7 },
            'ガソリン': { density: 0.74, calorificValue: 43.5 },
            'プロパンガス': { density: 0.51, calorificValue: 50.3 }
        };
        this.stoveTypes = {
            '標準型ストーブ': { efficiency: 0.8, power: 2.5 },
            'ハイパワーストーブ': { efficiency: 0.75, power: 4.0 },
            '省エネストーブ': { efficiency: 0.9, power: 1.8 }
        };
    }
    init() {
        this.setupEventListeners();
        this.setupFuelSelect();
        this.setupStoveSelect();
    }
    setupFuelSelect() {
        const fuelSelect = this.container.querySelector('#fuel-type');
        if (!fuelSelect)
            return;
        Object.keys(this.fuelTypes).forEach(fuel => {
            const option = document.createElement('option');
            option.value = fuel;
            option.textContent = fuel;
            fuelSelect.appendChild(option);
        });
        fuelSelect.addEventListener('change', () => this.updateFuelDefaults());
    }
    setupStoveSelect() {
        const stoveSelect = this.container.querySelector('#stove-type');
        if (!stoveSelect)
            return;
        Object.keys(this.stoveTypes).forEach(stove => {
            const option = document.createElement('option');
            option.value = stove;
            option.textContent = stove;
            stoveSelect.appendChild(option);
        });
        stoveSelect.addEventListener('change', () => this.updateStoveDefaults());
    }
    updateFuelDefaults() {
        const fuelSelect = this.container.querySelector('#fuel-type');
        const densityInput = this.container.querySelector('#fuel-density');
        const selectedFuel = (fuelSelect?.value ?? '');
        const fuelData = selectedFuel ? this.fuelTypes[selectedFuel] : undefined;
        if (fuelData && densityInput)
            densityInput.value = String(fuelData.density);
    }
    updateStoveDefaults() {
        const stoveSelect = this.container.querySelector('#stove-type');
        const effInput = this.container.querySelector('#stove-efficiency');
        const powerInput = this.container.querySelector('#stove-power');
        const selectedStove = (stoveSelect?.value ?? '');
        const stoveData = selectedStove ? this.stoveTypes[selectedStove] : undefined;
        if (stoveData && effInput && powerInput) {
            effInput.value = String(stoveData.efficiency);
            powerInput.value = String(stoveData.power);
        }
    }
    calculateBurnRate(fuelData, stoveData) {
        // 燃焼速度 = (ストーブ出力 / (燃料の発熱量 * ストーブ効率)) * 3600 / 1000 [kg/h]
        return (stoveData.power / (fuelData.calorificValue * stoveData.efficiency)) * 3600 / 1000;
    }
    setupEventListeners() {
        const calculateButton = this.container.querySelector('#calculate-stove');
        if (!calculateButton)
            return;
        calculateButton.addEventListener('click', () => this.calculate());
    }
    formatTime(decimalHours) {
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);
        return `${hours}時間${minutes}分`;
    }
    calculate() {
        const fuelSelect = this.container.querySelector('#fuel-type');
        const selectedFuel = (fuelSelect?.value ?? '');
        const fuelData = selectedFuel ? this.fuelTypes[selectedFuel] : undefined;
        const stoveSelect = this.container.querySelector('#stove-type');
        const selectedStove = (stoveSelect?.value ?? '');
        const stoveData = selectedStove ? this.stoveTypes[selectedStove] : undefined;
        if (!fuelData || !stoveData)
            return;
        const burnRate = this.calculateBurnRate(fuelData, stoveData);
        const fuelVolumeInput = this.container.querySelector('#fuel-volume');
        const fuelVolume = parseFloat(fuelVolumeInput?.value ?? '');
        const fuelMass = fuelVolume * fuelData.density;
        const fullBurnTime = fuelMass / burnRate;
        const eightyPercentTime = fullBurnTime * 0.8;
        const waterVolumeInput = this.container.querySelector('#water-volume');
        const waterVolume = parseFloat(waterVolumeInput?.value ?? '');
        const evaporationRate = burnRate * 2;
        const fullEvaporationTime = waterVolume / evaporationRate;
        const twentyPercentRemainingTime = fullEvaporationTime * 0.8;
        const fuelResult = this.container.querySelector('#fuel-result');
        if (fuelResult) {
            fuelResult.innerHTML = `
				<p>燃料質量: ${fuelMass.toFixed(2)} kg</p>
				<p>計算された燃焼速度: ${burnRate.toFixed(4)} kg/h</p>
				<p>完全燃焼時間: ${this.formatTime(fullBurnTime)}</p>
				<p>80%燃焼時間: ${this.formatTime(eightyPercentTime)}</p>
			`;
        }
        const waterResult = this.container.querySelector('#water-result');
        if (waterResult) {
            waterResult.innerHTML = `
				<p>蒸発速度: ${evaporationRate.toFixed(2)} L/h</p>
				<p>完全蒸発時間: ${this.formatTime(fullEvaporationTime)}</p>
				<p>20%残るまでの時間: ${this.formatTime(twentyPercentRemainingTime)}</p>
			`;
        }
    }
}
exports.StoveComponent = StoveComponent;
// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.StoveComponent = StoveComponent;
