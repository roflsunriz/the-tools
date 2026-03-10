export class AlarmComponent {
	private alarmTime: number | null;
	private alarmTimeout: ReturnType<typeof setTimeout> | null;
	private audio: HTMLAudioElement | null;
	private presetMinutes: number[];

	constructor() {
		this.alarmTime = null;
		this.alarmTimeout = null;
		this.audio = null;
		this.presetMinutes = [];
	}

	public init(): void {
		(document.getElementById('set-alarm-button') as HTMLElement)?.addEventListener('click', () => this.setAlarm());
		(document.getElementById('stop-music-button') as HTMLElement)?.addEventListener('click', () => this.stopMusic());
		(document.getElementById('preset-select') as HTMLSelectElement)?.addEventListener('change', (e: Event) => {
			const target = e.target as HTMLSelectElement;
			this.setPresetAlarmTime(parseInt(target.value, 10));
		});
		(document.getElementById('volume') as HTMLInputElement)?.addEventListener('input', () => this.updateVolume());
		this.generatePresetOptions();
	}

	private showCustomAlert(message: string): void {
		const messageDiv = document.getElementById('alarm-message') as HTMLElement | null;
		if (!messageDiv) return;
		messageDiv.textContent = message;
		messageDiv.style.display = 'block';
		setTimeout(() => (messageDiv.style.display = 'none'), 3000);
	}

	private setAlarm(): void {
		const alarmInputEl = document.getElementById('alarm-time') as HTMLInputElement | null;
		const alarmInput = alarmInputEl?.value ?? '';
		this.alarmTime = new Date(alarmInput).getTime();
		const currentTime = Date.now();
		const timeToAlarm = (this.alarmTime ?? 0) - currentTime;
		if (timeToAlarm >= 0) {
			this.alarmTimeout = setTimeout(() => this.playMusic(), timeToAlarm);
			this.showCustomAlert('アラームが設定されました！');
		} else {
			this.showCustomAlert('未来の時間を設定してください。');
		}
	}

	private playMusic(): void {
		const fileInput = document.getElementById('music-file') as HTMLInputElement | null;
		const musicFile = fileInput?.files?.[0];
		if (musicFile) {
			const objectURL = URL.createObjectURL(musicFile);
			this.audio = new Audio(objectURL);
			this.updateVolume();
			void this.audio.play();
			this.showCustomAlert('音楽を再生中...');
		} else {
			this.showCustomAlert('音楽ファイルをアップロードしてください。');
		}
	}

	private stopMusic(): void {
		if (this.audio) {
			this.audio.pause();
			this.audio.currentTime = 0;
		}
		if (this.alarmTimeout) {
			clearTimeout(this.alarmTimeout);
			this.alarmTimeout = null;
		}
		this.showCustomAlert('音楽を停止しました。');
	}

	private setPresetAlarmTime(minutes: number): void {
		const now = new Date();
		now.setMinutes(now.getMinutes() + minutes);
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutesFormatted = String(now.getMinutes()).padStart(2, '0');
		const formattedTime = `${year}-${month}-${day}T${hours}:${minutesFormatted}`;
		const alarmInput = document.getElementById('alarm-time') as HTMLInputElement | null;
		if (alarmInput) alarmInput.value = formattedTime;
	}

	private updateVolume(): void {
		const volumeSlider = document.getElementById('volume') as HTMLInputElement | null;
		const volumeLabel = document.getElementById('volume-label') as HTMLElement | null;
		const volume = parseFloat(volumeSlider?.value ?? '0');
		if (this.audio && !Number.isNaN(volume)) {
			this.audio.volume = volume;
		}
		const perceivedVolume = Math.pow(10, volume * 2) / 100;
		if (volumeLabel) volumeLabel.textContent = `音量: ${volume.toFixed(2)} (${perceivedVolume.toFixed(2)})`;
	}

	private generatePresetOptions(): void {
		const selectElement = document.getElementById('preset-select') as HTMLSelectElement | null;
		if (!selectElement) return;
		for (let i = 1; i < 60; i++) {
			if ([1, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].includes(i)) {
				this.presetMinutes.push(i);
			}
		}
		for (let i = 60; i <= 1440; i += 30) {
			this.presetMinutes.push(i);
		}
		for (const minutes of this.presetMinutes) {
			const option = document.createElement('option');
			option.value = String(minutes);
			let displayMinutes = minutes;
			let displayHours = 0;
			if (minutes >= 60) {
				displayHours = Math.floor(minutes / 60);
				displayMinutes = minutes % 60;
			}
			option.text = `${displayHours > 0 ? displayHours + '時間' : ''}${displayMinutes}分後`;
			selectElement.appendChild(option);
		}
	}
}

// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).AlarmComponent = AlarmComponent;


