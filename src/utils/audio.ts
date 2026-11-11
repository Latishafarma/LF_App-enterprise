// Audio synthesizer for hospital queue chime using Web Audio API
export function playQueueChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        resolve();
        return;
      }

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Hospital chime notes: D5 -> A5 -> F#5 -> D5 (classic pleasant two-tone or four-tone airport/hospital chime)
      const notes = [
        { freq: 587.33, start: 0, duration: 0.35 },    // D5
        { freq: 880.00, start: 0.25, duration: 0.4 },   // A5
        { freq: 739.99, start: 0.5, duration: 0.45 },   // F#5
        { freq: 587.33, start: 0.75, duration: 0.6 }    // D5
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        // Envelope
        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.3, now + note.start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.05);
      });

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
        resolve();
      }, 1400);
    } catch {
      resolve();
    }
  });
}

// Indonesian Voice Announcer via Web Speech Synthesis
export function announceQueueVoice(nomor: string, nama: string, poli: string = 'Ruang Periksa Dokter'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    // Spacing numbers for natural phonetic reading in Indonesian (e.g., A-001 -> A, kosong kosong satu)
    const formattedNomor = nomor
      .replace('A-00', 'A, kosong, kosong, ')
      .replace('A-0', 'A, kosong, ')
      .replace('A-', 'A, ');

    const text = `Nomor antrean, ${formattedNomor}, atas nama, ${nama}, silakan menuju ke ${poli}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.88;
    utterance.pitch = 1.05;

    // Pick Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID') || v.name.toLowerCase().includes('indonesia'));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    // Play chime first then speak
    playQueueChime().then(() => {
      window.speechSynthesis.speak(utterance);
    });
  });
}
