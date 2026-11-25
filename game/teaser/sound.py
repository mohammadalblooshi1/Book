"""Synthesises the 10-second teaser soundtrack: python3 sound.py out.wav"""
import sys
import wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 48000
T = 10.0
n = int(SR * T)
t = np.arange(n) / SR
rng = np.random.default_rng(7)


def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype='band')
    return lfilter(b, a, x)


def lp(x, f):
    b, a = butter(2, f / (SR / 2), btype='low')
    return lfilter(b, a, x)


def hp(x, f):
    b, a = butter(2, f / (SR / 2), btype='high')
    return lfilter(b, a, x)


def env(t0, a, s, r, t1):
    """Attack from t0, sustain, release so it ends at t1."""
    e = np.zeros(n)
    i0, i1 = int(t0 * SR), int(t1 * SR)
    seg = np.arange(i1 - i0) / SR
    dur = t1 - t0
    e[i0:i1] = np.clip(np.minimum(seg / max(a, 1e-3), 1), 0, 1) * np.clip((dur - seg) / max(r, 1e-3), 0, 1) * s
    return e


out = np.zeros(n)

# wind: two bands of noise breathing slowly; cut dead at the impact
wind = bp(rng.standard_normal(n), 250, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t)) + bp(rng.standard_normal(n), 1200, 3000) * 0.25
wind *= env(0.0, 1.2, 1.0, 0.05, 8.86) * 0.35
wind *= 1 + 1.2 * env(5.0, 0.3, 1, 1.0, 6.6)  # the wind rises with the whisper
out += wind

# low drone that grows as the sand rises
drone = (np.sin(2 * np.pi * 55 * t) + 0.6 * np.sin(2 * np.pi * 82.4 * t) + 0.3 * np.sin(2 * np.pi * 110.3 * t))
drone *= env(2.0, 3.0, 1, 0.05, 8.86) * np.clip((t - 2) / 6.5, 0, 1) * 0.22
out += drone

# the whisper: "Thee-yaab", breathy formant noise in three parts, echoed by the wind
def whisper(start, gain):
    w = np.zeros(n)
    noise = rng.standard_normal(n)
    w += hp(noise, 3500) * env(start, 0.03, 1.0, 0.06, start + 0.16) * 0.9            # "Th"
    w += (bp(noise, 250, 420) * 0.5 + bp(noise, 2100, 2600)) * env(start + 0.12, 0.05, 1, 0.12, start + 0.48)  # "ee"
    w += (bp(noise, 600, 850) + bp(noise, 1050, 1350) * 0.8) * env(start + 0.42, 0.06, 1, 0.35, start + 1.05)  # "yaa"
    w += lp(noise, 400) * env(start + 1.02, 0.01, 0.6, 0.05, start + 1.1)              # "b"
    return w * gain


wh = whisper(5.05, 0.9)
for d, g in [(0.22, 0.45), (0.47, 0.25), (0.8, 0.12)]:
    shift = int(d * SR)
    wh[shift:] += whisper(5.05, g)[:-shift] if shift else 0
out += wh

# the Light flares: a rising golden tone
k = env(6.95, 0.15, 1, 0.5, 7.85)
freq = 300 + 900 * np.clip((t - 6.95) / 0.5, 0, 1)
phase = 2 * np.pi * np.cumsum(freq) / SR
out += (np.sin(phase) + 0.4 * np.sin(2 * phase)) * k * 0.18

# the lamp dies: a soft breath out
out += lp(rng.standard_normal(n), 700) * env(7.7, 0.02, 1, 0.25, 8.0) * 0.4

# the stone: a rising whoosh
wz = bp(rng.standard_normal(n), 400, 4000) * env(8.25, 0.55, 1, 0.02, 8.86) * np.clip((t - 8.25) / 0.61, 0, 1) ** 2
out += wz * 0.9

# impact: boom + crack, then total silence
i = int(8.86 * SR)
tt = np.arange(n - i) / SR
boom = np.sin(2 * np.pi * (48 * tt + 30 * (1 - np.exp(-tt * 18)) / 18)) * np.exp(-tt * 3.2)
crack = hp(rng.standard_normal(n - i), 2500) * np.exp(-tt * 22)
imp = np.zeros(n)
imp[i:] = boom * 1.0 + crack * 0.8
imp *= (t < 9.25)
out += imp

# the title sting: one deep, slow note
i2 = int(9.3 * SR)
tt2 = np.arange(n - i2) / SR
note = (np.sin(2 * np.pi * 73.4 * tt2) + 0.5 * np.sin(2 * np.pi * 146.8 * tt2) + 0.25 * np.sin(2 * np.pi * 220.2 * tt2)) * np.exp(-tt2 * 1.8) * np.clip(tt2 / 0.02, 0, 1)
out[i2:] += note * 0.35

out = np.tanh(out * 1.3) * 0.9
out *= np.clip((T - t) / 0.05, 0, 1)
pcm = (out * 32767).astype(np.int16)
stereo = np.stack([pcm, pcm], axis=1)
with wave.open(sys.argv[1], 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(stereo.tobytes())
print('ok', len(pcm) / SR, 's')
