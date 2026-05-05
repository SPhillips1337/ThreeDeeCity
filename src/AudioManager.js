export class AudioManager {
  constructor() {
    this.allTracks = [
      '/music/alisiabeats-city-streets-342387.mp3',
      '/music/araorenda-city-vibes-247646.mp3',
      '/music/bransboynd-night-city-418052.mp3',
      '/music/gritz16-gemma-party-430732.mp3',
      '/music/joyinsound-lion-city-growth-391737.mp3',
      '/music/lnplusmusic-jazz-background-music-416542.mp3',
      '/music/mosesharrisjr-big-city-big-dreams-217874.mp3',
      '/music/music_for_video-in-the-city-110589.mp3',
      '/music/tavccitypop-kanashimi-no-koi-tavc-city-pop-361227.mp3',
      '/music/tavccitypop-tavc-city-pop-361207.mp3',
      '/music/tavccitypop-tavc-city-pop-361214.mp3',
      '/music/tawipop-city-pulse-2-338784.mp3'
    ];
    this.playlist = [...this.allTracks];
    this.currentIndex = 0;
    this.audio = new Audio();
    this.audio.volume = 0.3;
    this.isMuted = true;
    this.isInitialized = false;
    this.currentStation = 'all';

    this.audio.addEventListener('ended', () => this.nextTrack());
  }

  init() {
    if (this.isInitialized) return;
    this.shufflePlaylist();
    this.loadTrack(this.currentIndex);
    this.isInitialized = true;
  }

  setStation(station) {
    this.currentStation = station;
    if (station === 'jazz') {
      this.playlist = this.allTracks.filter(t => t.includes('jazz'));
    } else if (station === 'japanese') {
      this.playlist = this.allTracks.filter(t => t.includes('tavc'));
    } else {
      this.playlist = [...this.allTracks];
    }
    
    this.currentIndex = 0;
    this.shufflePlaylist();
    this.loadTrack(this.currentIndex);
  }

  shufflePlaylist() {
    if (this.playlist.length <= 1) return;
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
    if (this.playlist.length === 0) return;
    this.audio.src = this.playlist[index % this.playlist.length];
    this.audio.load();
    if (!this.isMuted) {
      this.audio.play().catch(e => console.log("Playback failed:", e));
    }
  }

  nextTrack() {
    if (this.playlist.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.loadTrack(this.currentIndex);
  }
}
