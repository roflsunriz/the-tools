"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlarmComponent = void 0;
class AlarmComponent {
    constructor() {
        this.alarmTime = null;
        this.alarmTimeout = null;
        this.audio = null;
        this.presetMinutes = [];
    }
    init() {
        document.getElementById('set-alarm-button')?.addEventListener('click', () => this.setAlarm());
        document.getElementById('stop-music-button')?.addEventListener('click', () => this.stopMusic());
        document.getElementById('preset-select')?.addEventListener('change', (e) => {
            const target = e.target;
            this.setPresetAlarmTime(parseInt(target.value, 10));
        });
        document.getElementById('volume')?.addEventListener('input', () => this.updateVolume());
        this.generatePresetOptions();
    }
    showCustomAlert(message) {
        const messageDiv = document.getElementById('alarm-message');
        if (!messageDiv)
            return;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        setTimeout(() => (messageDiv.style.display = 'none'), 3000);
    }
    setAlarm() {
        const alarmInputEl = document.getElementById('alarm-time');
        const alarmInput = alarmInputEl?.value ?? '';
        this.alarmTime = new Date(alarmInput).getTime();
        const currentTime = Date.now();
        const timeToAlarm = (this.alarmTime ?? 0) - currentTime;
        if (timeToAlarm >= 0) {
            this.alarmTimeout = setTimeout(() => this.playMusic(), timeToAlarm);
            this.showCustomAlert('アラームが設定されました！');
        }
        else {
            this.showCustomAlert('未来の時間を設定してください。');
        }
    }
    playMusic() {
        const fileInput = document.getElementById('music-file');
        const musicFile = fileInput?.files?.[0];
        if (musicFile) {
            const objectURL = URL.createObjectURL(musicFile);
            this.audio = new Audio(objectURL);
            this.updateVolume();
            void this.audio.play();
            this.showCustomAlert('音楽を再生中...');
        }
        else {
            this.showCustomAlert('音楽ファイルをアップロードしてください。');
        }
    }
    stopMusic() {
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
    setPresetAlarmTime(minutes) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + minutes);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutesFormatted = String(now.getMinutes()).padStart(2, '0');
        const formattedTime = `${year}-${month}-${day}T${hours}:${minutesFormatted}`;
        const alarmInput = document.getElementById('alarm-time');
        if (alarmInput)
            alarmInput.value = formattedTime;
    }
    updateVolume() {
        const volumeSlider = document.getElementById('volume');
        const volumeLabel = document.getElementById('volume-label');
        const volume = parseFloat(volumeSlider?.value ?? '0');
        if (this.audio && !Number.isNaN(volume)) {
            this.audio.volume = volume;
        }
        const perceivedVolume = Math.pow(10, volume * 2) / 100;
        if (volumeLabel)
            volumeLabel.textContent = `音量: ${volume.toFixed(2)} (${perceivedVolume.toFixed(2)})`;
    }
    generatePresetOptions() {
        const selectElement = document.getElementById('preset-select');
        if (!selectElement)
            return;
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
exports.AlarmComponent = AlarmComponent;
// グローバル公開（既存 app.js が参照）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.AlarmComponent = AlarmComponent;
