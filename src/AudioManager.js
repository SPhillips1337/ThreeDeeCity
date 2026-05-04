export class AudioManager {
  constructor() {
    this.playlist = [
      '/music/alisiabeats-city-streets-342387.mp3',
      '/music/araorenda-city-vibes-247646.mp3',
      '/music/bransboynd-night-city-418052.mp3',
      '/music/joyinsound-lion-city-growth-391737.mp3',
      '/music/mosesharrisjr-big-city-big-dreams-217874.mp3',
      '/music/tawipop-city-pulse-2-338784.mp3'
    ];
    this.currentIndex = 0;
    this.audio = new Audio();
    this.audio.volume = 0.3;
    this.isMuted = true;
    this.isInitialized = false;

    this.audio.addEventListener('ended', () => this.nextTrack());
  }

  init() {
    if (this.isInitialized) return;
    this.shufflePlaylist();
    this.loadTrack(this.currentIndex);
    this.isInitialized = true;
  }

  shufflePlaylist() {
    for (let i = this.playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      if (!this.audio.src) {
        this.loadTrack(this.currentIndex);
      }
      this.audio.play().catch(e => console.log("Autoplay blocked, waiting for interaction"));
    } else {
      this.audio.pause();
    }
    return this.isMuted;
  }

  loadTrack(index) {
    this.audio.src = this.playlist[index];
    this.audio.load();
    if (!this.isMuted) {
      this.audio.play().catch(e => console.log("Playback failed:", e));
    }
  }

  nextTrack() {
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.loadTrack(this.currentIndex);
  }
}
