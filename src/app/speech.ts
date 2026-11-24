/** النطق بصوت ألماني (Web Speech API). بيشتغل من غير نت لو الصوت متنزّل على الموبايل. */

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function germanVoice(): SpeechSynthesisVoice | null {
  if (!supported) return null;
  const voices = speechSynthesis.getVoices();
  const de = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('de'));
  return de.find((v) => v.lang.replace('_', '-').toLowerCase() === 'de-de') ?? de[0] ?? null;
}

/**
 * بيستنى قايمة الأصوات (على أندرويد بتيجي متأخر شوية)، وبيقول فيه صوت ألماني ولا لأ.
 * null يعني المتصفح مابيدعمش النطق خالص.
 */
export function checkGermanVoice(cb: (ok: boolean | null) => void): void {
  if (!supported) return cb(null);
  if (speechSynthesis.getVoices().length) return cb(!!germanVoice());
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    cb(!!germanVoice());
  };
  speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
  window.setTimeout(finish, 1500);
}

export function speak(text: string): void {
  if (!supported) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  const v = germanVoice();
  if (v) u.voice = v;
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
