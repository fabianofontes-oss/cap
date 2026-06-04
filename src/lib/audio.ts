import { isSubscriptionActive } from './subscription';

export const playAudio = (text: string, lang: string = 'es-ES', speed: number = 0.9) => {
  if (localStorage.getItem('cap_audio_enabled') === 'false') {
    return; // respects mute option
  }

  // Support subscription limits — uses shared validator that also checks expiresAt
  const subRaw = localStorage.getItem('cap_subscription');
  let isPremium = false;
  if (subRaw) {
    try {
      isPremium = isSubscriptionActive(JSON.parse(subRaw));
    } catch (e) {}
  }

  if (!isPremium) {
    const playCount = parseInt(localStorage.getItem('cap_audio_play_count') || '0', 10);
    if (playCount >= 10) {
      window.dispatchEvent(new CustomEvent('cap_premium_limit_audio'));
      return;
    }
    localStorage.setItem('cap_audio_play_count', (playCount + 1).toString());
  }

  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = speed;

    const assignVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => v.lang.startsWith('es-'));
      if (targetVoice) {
        utterance.voice = targetVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // Voices not yet loaded — wait for the voiceschanged event (fires once)
      window.speechSynthesis.addEventListener('voiceschanged', assignVoiceAndSpeak, { once: true } as EventListenerOptions);
    } else {
      assignVoiceAndSpeak();
    }
  } else {
    console.warn('Text-to-speech is not supported in this browser.');
  }
};
