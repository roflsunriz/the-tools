type FuelKey = '灯油' | 'ガソリン' | 'プロパンガス';
type StoveKey = '標準型ストーブ' | 'ハイパワーストーブ' | '省エネストーブ';

type Fuel = { density: number; calorificValue: number };
type Stove = { efficiency: number; power: number };

export class StoveComponent {
	private container!: HTMLElement;
	private fuelTypes: Record<FuelKey, Fuel>;
	private stoveTypes: Record<StoveKey, Stove>;

	constructor() {
		this.container = document.getElementById('stove-tab') as HTMLElement;
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

	public init(): void {
		this.setupEventListeners();
		this.setupFuelSelect();
		this.setupStoveSelect();
	}

	private setupFuelSelect(): void {
		const fuelSelect = this.container.querySelector('#fuel-type') as HTMLSelectElement | null;
		if (!fuelSelect) return;
		(Object.keys(this.fuelTypes) as FuelKey[]).forEach(fuel => {
			const option = document.createElement('option');
			option.value = fuel;
			option.textContent = fuel;
			fuelSelect.appendChild(option);
		});
		fuelSelect.addEventListener('change', () => this.updateFuelDefaults());
	}

	private setupStoveSelect(): void {
		const stoveSelect = this.container.querySelector('#stove-type') as HTMLSelectElement | null;
		if (!stoveSelect) return;
		(Object.keys(this.stoveTypes) as StoveKey[]).forEach(stove => {
			const option = document.createElement('option');
			option.value = stove;
			option.textContent = stove;
			stoveSelect.appendChild(option);
		});
		stoveSelect.addEventListener('change', () => this.updateStoveDefaults());
	}

	private updateFuelDefaults(): void {
		const fuelSelect = this.container.querySelector('#fuel-type') as HTMLSelectElement | null;
		const densityInput = this.container.querySelector('#fuel-density') as HTMLInputElement | null;
		const selectedFuel = (fuelSelect?.value ?? '') as FuelKey | '';
		const fuelData = selectedFuel ? this.fuelTypes[selectedFuel] : undefined;
		if (fuelData && densityInput) densityInput.value = String(fuelData.density);
	}

	private updateStoveDefaults(): void {
		const stoveSelect = this.container.querySelector('#stove-type') as HTMLSelectElement | null;
		const effInput = this.container.querySelector('#stove-efficiency') as HTMLInputElement | null;
		const powerInput = this.container.querySelector('#stove-power') as HTMLInputElement | null;
		const selectedStove = (stoveSelect?.value ?? '') as StoveKey | '';
		const stoveData = selectedStove ? this.stoveTypes[selectedStove] : undefined;
		if (stoveData && effInput && powerInput) {
			effInput.value = String(stoveData.efficiency);
			powerInput.value = String(stoveData.power);
		}
	}

	private calculateBurnRate(fuelData: Fuel, stoveData: Stove): number {
		// 燃焼速度 = (ストーブ出力 / (燃料の発熱量 * ストーブ効率)) * 3600 / 1000 [kg/h]
		return (stoveData.power / (fuelData.calorificValue * stoveData.efficiency)) * 3600 / 1000;
	}

	private setupEventListeners(): void {
		const calculateButton = this.container.querySelector('#calculate-stove') as HTMLElement | null;
		if (!calculateButton) return;
		calculateButton.addEventListener('click', () => this.calculate());
	}

	private formatTime(decimalHours: number): string {
		const hours = Math.floor(decimalHours);
		const minutes = Math.round((decimalHours - hours) * 60);
		return `${hours}時間${minutes}分`;
	}

	private calculate(): void {
		const fuelSelect = this.container.querySelector('#fuel-type') as HTMLSelectElement | null;
		const selectedFuel = (fuelSelect?.value ?? '') as FuelKey | '';
		const fuelData = selectedFuel ? this.fuelTypes[selectedFuel] : undefined;

		const stoveSelect = this.container.querySelector('#stove-type') as HTMLSelectElement | null;
		const selectedStove = (stoveSelect?.value ?? '') as StoveKey | '';
		const stoveData = selectedStove ? this.stoveTypes[selectedStove] : undefined;

		if (!fuelData || !stoveData) return;

		const burnRate = this.calculateBurnRate(fuelData, stoveData);

		const fuelVolumeInput = this.container.querySelector('#fuel-volume') as HTMLInputElement | null;
		const fuelVolume = parseFloat(fuelVolumeInput?.value ?? '');
		const fuelMass = fuelVolume * fuelData.density;
		const fullBurnTime = fuelMass / burnRate;
		const eightyPercentTime = fullBurnTime * 0.8;

		const waterVolumeInput = this.container.querySelector('#water-volume') as HTMLInputElement | null;
		const waterVolume = parseFloat(waterVolumeInput?.value ?? '');
		const evaporationRate = burnRate * 2;
		const fullEvaporationTime = waterVolume / evaporationRate;
		const twentyPercentRemainingTime = fullEvaporationTime * 0.8;

		const fuelResult = this.container.querySelector('#fuel-result') as HTMLElement | null;
		if (fuelResult) {
			fuelResult.innerHTML = `
				<p>燃料質量: ${fuelMass.toFixed(2)} kg</p>
				<p>計算された燃焼速度: ${burnRate.toFixed(4)} kg/h</p>
				<p>完全燃焼時間: ${this.formatTime(fullBurnTime)}</p>
				<p>80%燃焼時間: ${this.formatTime(eightyPercentTime)}</p>
			`;
		}

		const waterResult = this.container.querySelector('#water-result') as HTMLElement | null;
		if (waterResult) {
			waterResult.innerHTML = `
				<p>蒸発速度: ${evaporationRate.toFixed(2)} L/h</p>
				<p>完全蒸発時間: ${this.formatTime(fullEvaporationTime)}</p>
				<p>20%残るまでの時間: ${this.formatTime(twentyPercentRemainingTime)}</p>
			`;
		}
	}
}

// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).StoveComponent = StoveComponent;


