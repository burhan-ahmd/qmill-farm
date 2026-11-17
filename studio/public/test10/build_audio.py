# Test10 music bed + SFX (no narration): a light hotel-auction vamp, one gavel tick at
# 5.7 s, one rising flourish on the SOLD AGAIN reveal at 8.4 s. 10.000 s, 48 kHz stereo, 24-bit.
# Mastered to -16.0 LUFS integrated / <= -1.0 dBTP by the ffmpeg loudnorm pass in build_test10_audio.ps1.
# usage: python studio/public/test10/build_audio.py <out.wav>
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 10.0
N = int(round(SR * DUR))
t = np.arange(N) / SR

rng = np.random.default_rng(7)


def note(freq, start, dur, amp=1.0, decay=6.0, harm=(1.0, 0.28, 0.12)):
    """Plucked-string-ish tone: exponential decay, soft attack, a few harmonics."""
    a = int(round(start * SR))
    n = int(round(dur * SR))
    if a >= N:
        return None, 0, 0
    n = min(n, N - a)
    u = np.arange(n) / SR
    env = np.exp(-u * decay) * (1 - np.exp(-u * 220))
    s = np.zeros(n)
    for i, h in enumerate(harm):
        s += h * np.sin(2 * np.pi * freq * (i + 1) * u + i * 0.4)
    return amp * env * s, a, a + n


music = np.zeros((2, N))

# Bass line: F - C - F - Bb | F - C - F - C  (a plain, jaunty auction vamp in F major)
bass = [(0.00, 87.31), (0.50, 87.31), (1.00, 130.81), (1.50, 130.81),
        (2.00, 87.31), (2.50, 87.31), (3.00, 116.54), (3.50, 116.54),
        (4.00, 87.31), (4.50, 87.31), (5.00, 130.81), (5.50, 130.81),
        (6.00, 87.31), (6.50, 87.31), (7.00, 116.54), (7.50, 130.81),
        (8.00, 174.61), (8.50, 174.61), (9.00, 174.61), (9.50, 174.61)]
for start, f in bass:
    s, a, b = note(f, start, 0.55, amp=0.42, decay=7.0, harm=(1.0, 0.22))
    if s is not None:
        music[0, a:b] += s
        music[1, a:b] += s * 0.96

# Off-beat chord stabs (pizzicato), giving the bed its bounce.
chords = [
    (0.25, [174.61, 220.00, 261.63]),
    (0.75, [174.61, 220.00, 261.63]),
    (1.25, [196.00, 261.63, 329.63]),
    (1.75, [196.00, 261.63, 329.63]),
    (2.25, [174.61, 220.00, 261.63]),
    (2.75, [174.61, 220.00, 261.63]),
    (3.25, [233.08, 293.66, 349.23]),
    (3.75, [233.08, 293.66, 349.23]),
    (4.25, [174.61, 220.00, 261.63]),
    (4.75, [174.61, 220.00, 261.63]),
    (5.25, [196.00, 261.63, 329.63]),
    (5.75, [196.00, 261.63, 329.63]),
    (6.25, [174.61, 220.00, 261.63]),
    (6.75, [174.61, 220.00, 261.63]),
    (7.25, [233.08, 293.66, 349.23]),
    (7.75, [233.08, 293.66, 349.23]),
    (8.25, [174.61, 220.00, 261.63]),
    (8.75, [233.08, 293.66, 349.23]),
    (9.25, [174.61, 220.00, 261.63, 349.23]),
]
for start, freqs in chords:
    for k, f in enumerate(freqs):
        pan = [-0.35, 0.0, 0.35][k % 3]
        s, a, b = note(f, start, 0.30, amp=0.16, decay=13.0, harm=(1.0, 0.18))
        if s is None:
            continue
        music[0, a:b] += s * (1 - max(0.0, pan))
        music[1, a:b] += s * (1 + min(0.0, pan))

# ---- SFX 1: wooden gavel tick on the table (5.70 s) ----
sfx = np.zeros((2, N))
a = int(5.70 * SR)
n = int(0.30 * SR)
u = np.arange(n) / SR
knock = (0.55 * np.exp(-u * 30) * np.sin(2 * np.pi * 620 * u)
         + 0.30 * np.exp(-u * 55) * np.sin(2 * np.pi * 1180 * u)
         + 0.20 * np.exp(-u * 90) * rng.standard_normal(n))
for ch in range(2):
    sfx[ch, a:a + n] += knock * (1.0 if ch == 0 else 0.9)

# ---- SFX 2: rising flourish as the placard flips to SOLD AGAIN (8.35 -> 9.05 s) ----
for i, f in enumerate([261.63, 329.63, 392.00, 523.25]):
    start = 8.35 + i * 0.16
    s, a2, b2 = note(f, start, 0.85, amp=0.20, decay=2.4, harm=(1.0, 0.35, 0.18))
    if s is not None:
        sfx[0, a2:b2] += s * 0.85
        sfx[1, a2:b2] += s

# ---- space: a short synthetic room reverb on the music only ----
ir_n = int(0.55 * SR)
ir_t = np.arange(ir_n) / SR
ir = rng.standard_normal(ir_n) * np.exp(-ir_t * 9.0)
ir[0] = 0.0
ir /= np.max(np.abs(ir)) or 1.0
wet = np.stack([fftconvolve(music[ch], ir)[:N] for ch in range(2)])
music = 0.86 * music + 0.14 * wet

mix = music + sfx

# Gentle bus shaping: keep lows out of the way, soften the top.
sos_hp = butter(2, 42, fs=SR, btype="highpass", output="sos")
sos_lp = butter(2, 15500, fs=SR, btype="lowpass", output="sos")
mix = np.stack([sosfilt(sos_lp, sosfilt(sos_hp, mix[ch])) for ch in range(2)])

# Fade in from silence, hold the button, fade out cleanly to exactly 10.000 s.
fade_in = np.clip(t / 0.03, 0, 1)
fade_out = np.clip((DUR - t) / 0.30, 0, 1)
mix *= np.minimum(fade_in, fade_out)

peak = np.max(np.abs(mix))
if peak > 0:
    mix *= 0.70 / peak  # loudnorm in the next step brings this to -16 LUFS / -1 dBTP

pcm = np.clip(mix.T, -1.0, 1.0)
q = np.round(pcm * 8388607).astype(np.int32)
raw = np.empty((N, 6), dtype=np.uint8)
for ch in range(2):
    raw[:, ch * 3 + 0] = (q[:, ch] & 0xFF)
    raw[:, ch * 3 + 1] = ((q[:, ch] >> 8) & 0xFF)
    raw[:, ch * 3 + 2] = ((q[:, ch] >> 16) & 0xFF)

out = sys.argv[1]
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(3)
    w.setframerate(SR)
    w.writeframes(raw.tobytes())
print(f"wrote {out}: {N} samples = {N / SR:.3f} s, 48 kHz stereo 24-bit")
