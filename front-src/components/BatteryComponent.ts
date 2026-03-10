export class BatteryComponent {
	private capacityInput!: HTMLInputElement;
	private wattsInput!: HTMLInputElement;
	private currentInput!: HTMLInputElement;
	private voltageInput!: HTMLInputElement;
	private calculateButton!: HTMLElement;
	private resultBox!: HTMLElement;
	private powerModeInputs!: NodeListOf<HTMLInputElement>;
	private wattsInputGroup!: HTMLElement;
	private currentVoltageInputGroup!: HTMLElement;
	private currentChargeInput!: HTMLInputElement;

	constructor() {
		this.capacityInput = document.getElementById('battery-capacity') as HTMLInputElement;
		this.wattsInput = document.getElementById('charger-watts') as HTMLInputElement;
		this.currentInput = document.getElementById('charger-current') as HTMLInputElement;
		this.voltageInput = document.getElementById('charger-voltage') as HTMLInputElement;
		this.calculateButton = document.getElementById('calculate-charging') as HTMLElement;
		this.resultBox = document.getElementById('battery-result') as HTMLElement;
		this.powerModeInputs = document.getElementsByName('power-mode') as NodeListOf<HTMLInputElement>;
		this.wattsInputGroup = document.getElementById('watts-input') as HTMLElement;
		this.currentVoltageInputGroup = document.getElementById('current-voltage-input') as HTMLElement;
		this.currentChargeInput = document.getElementById('current-charge') as HTMLInputElement;
	}

	public init(): void {
		this.calculateButton.addEventListener('click', () => this.calculateChargingTime());
		this.powerModeInputs.forEach(input => {
			input.addEventListener('change', () => this.toggleInputMode());
		});
	}

	private toggleInputMode(): void {
		const checked = document.querySelector('input[name="power-mode"]:checked') as HTMLInputElement | null;
		const isWattsMode = (checked?.value ?? '') === 'watts';
		this.wattsInputGroup.style.display = isWattsMode ? 'block' : 'none';
		this.currentVoltageInputGroup.style.display = isWattsMode ? 'none' : 'block';
	}

	private calculateChargingTime(): void {
		const capacity = parseFloat(this.capacityInput.value);
		const currentCharge = parseFloat(this.currentChargeInput.value);
		let power = 0;

		const checked = document.querySelector('input[name="power-mode"]:checked') as HTMLInputElement | null;
		const isWattsMode = (checked?.value ?? '') === 'watts';
		if (isWattsMode) {
			power = parseFloat(this.wattsInput.value);
		} else {
			const current = parseFloat(this.currentInput.value);
			const voltage = parseFloat(this.voltageInput.value);
			power = current * voltage;
		}

		if (
			isNaN(capacity) || isNaN(power) || capacity <= 0 || power <= 0 ||
			isNaN(currentCharge) || currentCharge < 0 || currentCharge > 100
		) {
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

		const formatTime = (hours: number): string => {
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

// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).BatteryComponent = BatteryComponent;


