"""Heroic 10-second trailer score, synthesised: python3 music.py out.wav
D minor, 132 BPM: taiko drums, string ostinato, brass chords, braams on the title cards,
then everything cuts at the death and a ringing silence before the title."""
import sys
import wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 48000
N = int(SR * 10)
t = np.arange(N) / SR
rng = np.random.default_rng(3)
BEAT = 60 / 132
out = np.zeros(N)


def filt(x, f, kind='low'):
    b, a = butter(2, np.array(f) / (SR / 2), btype=kind)
    return lfilter(b, a, x)


def place(sig, at, gain=1.0):
    i = int(at * SR)
    if i >= N:
        return
    j = min(N, i + len(sig))
    out[i:j] += sig[:j - i] * gain


def taiko(dur=0.9, f0=62):
    tt = np.arange(int(dur * SR)) / SR
    body = np.sin(2 * np.pi * (f0 * tt + 40 * (1 - np.exp(-tt * 30)) / 30)) * np.exp(-tt * 6)
    hit = filt(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 40)
    return body + hit * 0.6


def saw(freq, dur, bright=2500):
    tt = np.arange(int(dur * SR)) / SR
    s = 2 * ((freq * tt) % 1) - 1
    s += 2 * ((freq * 1.007 * tt) % 1) - 1
    return filt(s, bright)


def env(length, a=0.01, r=0.1):
    e = np.ones(length)
    ai, ri = int(a * SR), int(r * SR)
    if ai:
        e[:ai] = np.linspace(0, 1, ai)
    if ri:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e


def note(midi):
    return 440 * 2 ** ((midi - 69) / 12)


DEATH = 7.95
TITLE = 9.15

# opening: a lone low string swell under the hero on the dune
sw = saw(note(38), 1.25, 800) * env(int(1.25 * SR), 0.6, 0.1)
place(sw, 0.0, 0.25)

# drums from 1.2s: big hits on every beat, double hits on the off-beats as it builds
b = 1.2
while b < DEATH - 0.05:
    place(taiko(), b, 0.9)
    if b > 4.1:
        place(taiko(0.4, 90), b + BEAT / 2, 0.45)
    b += BEAT
# snare-like cracks on 2 and 4 in the fight
b = 4.1 + BEAT
while b < DEATH - 0.05:
    tt = np.arange(int(0.25 * SR)) / SR
    place(filt(rng.standard_normal(len(tt)), 1500, 'high') * np.exp(-tt * 18), b, 0.35)
    b += BEAT * 2

# string ostinato (16ths): D A F A / Bb F D F / C G E G / D A F A
pattern = [[62, 69, 65, 69], [58, 65, 62, 65], [60, 67, 64, 67], [62, 69, 65, 69]]
s16 = BEAT / 4
b, k = 1.2, 0
while b < DEATH - 0.02:
    bar = int((b - 1.2) / (BEAT * 4)) % 4
    f = note(pattern[bar][k % 4] + 12)
    ln = int(s16 * SR * 0.9)
    place(saw(f, s16 * 0.9, 4000) * env(ln, 0.004, 0.03), b, 0.08)
    b += s16
    k += 1

# brass chords, one per bar: Dm Bb C Dm
chords = [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [50, 57, 62, 69]]
b, i = 1.2, 0
while b < DEATH - 0.05:
    d = min(BEAT * 4, DEATH - b)
    ln = int(d * SR)
    ch = sum(saw(note(m), d, 1800) for m in chords[i % 4])
    place(ch * env(ln, 0.08, 0.15), b, 0.05 + 0.02 * min(i, 3))
    b += BEAT * 4
    i += 1

# braams on the title cards
for at in (3.4, 5.6):
    ln = int(0.7 * SR)
    br = sum(saw(note(m), 0.7, 600) for m in (26, 38, 45))
    place(br * env(ln, 0.01, 0.4), at, 0.35)
    place(taiko(1.2, 45), at, 1.1)

# the sword slash and the sand burst at 4.7s
tt = np.arange(int(0.35 * SR)) / SR
place(filt(rng.standard_normal(len(tt)), [1500, 7000], 'band') * np.sin(np.pi * tt / 0.35), 4.45, 0.7)
place(filt(rng.standard_normal(int(0.6 * SR)), 2000) * np.exp(-np.arange(int(0.6 * SR)) / SR * 6), 4.7, 0.5)

# riser into the leap
ln = int((DEATH - 6.2) * SR)
tt = np.arange(ln) / SR
rise = filt(rng.standard_normal(ln), [300, 6000], 'band') * (tt / tt[-1]) ** 2
place(rise, 6.2, 0.35)

# THE DEATH: everything stops. One enormous hit, then ringing ears
out[int(DEATH * SR):] = 0
place(taiko(1.6, 38) * 1.6, DEATH, 1.2)
tt = np.arange(int(1.2 * SR)) / SR
place(np.sin(2 * np.pi * 3100 * tt) * np.exp(-tt * 2.2), DEATH + 0.05, 0.06)
place(filt(rng.standard_normal(int(0.5 * SR)), 3000, 'high') * np.exp(-np.arange(int(0.5 * SR)) / SR * 10), DEATH, 0.5)

# the title: one deep boom and a held low D
place(taiko(2.0, 34) * 1.4, TITLE, 1.0)
ln = int((10 - TITLE) * SR)
pad = sum(saw(note(m), 10 - TITLE, 900) for m in (38, 50, 57))
place(pad * env(ln, 0.05, 0.2), TITLE, 0.09)

out = np.tanh(out * 1.4) * 0.92
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(np.stack([pcm, pcm], 1).tobytes())
print('ok')
