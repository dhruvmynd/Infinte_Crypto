// Synthesize retro-style sounds using Web Audio API
export class SoundEffects {
  private audioContext: AudioContext;
  private gainNode: GainNode;

  constructor() {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = 0.2; // Set default volume
  }

  setVolume(value: number) {
    this.gainNode.gain.value = value;
  }

  playPickupSound() {
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
    oscillator.frequency.exponentialRampToValueAtTime(1760, this.audioContext.currentTime + 0.1); // A6
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.gainNode);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  playDropSound() {
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.15); // A3
    
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.gainNode);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.15);
  }

  playCombineSound() {
    // Create a more complex sound for combination
    const mainOsc = this.audioContext.createOscillator();
    const subOsc = this.audioContext.createOscillator();
    
    mainOsc.type = 'sine';
    subOsc.type = 'square';
    
    mainOsc.frequency.setValueAtTime(440, this.audioContext.currentTime);
    mainOsc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.2);
    
    subOsc.frequency.setValueAtTime(220, this.audioContext.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.2);
    
    const mainGain = this.audioContext.createGain();
    const subGain = this.audioContext.createGain();
    
    mainGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    mainGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    subGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    mainOsc.connect(mainGain);
    subOsc.connect(subGain);
    mainGain.connect(this.gainNode);
    subGain.connect(this.gainNode);
    
    mainOsc.start();
    subOsc.start();
    mainOsc.stop(this.audioContext.currentTime + 0.2);
    subOsc.stop(this.audioContext.currentTime + 0.2);
  }
}