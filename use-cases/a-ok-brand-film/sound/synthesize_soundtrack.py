#!/usr/bin/env python3
"""Original A-OK 15 s score. Procedural synthesis only; no samples.

Python 3 + NumPy. Output: 48 kHz / stereo / 24-bit PCM WAV.
Deterministic sound generation and a transparent bus mix make this fully editable.
"""
from pathlib import Path
import json
import math
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent
SR = 48000
DURATION = 15.0
N = int(SR * DURATION)
RNG = np.random.default_rng(260927)
BUS = {name: np.zeros((N, 2), np.float64) for name in
       ['drums', 'bass', 'music', 'texture', 'transitions']}


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def time(duration):
    return np.arange(int(duration * SR)) / SR


def smooth_noise(duration, low=0, high=10000):
    n = int(duration * SR)
    x = RNG.standard_normal(n)
    f = np.fft.rfftfreq(n, 1 / SR)
    response = np.ones_like(f)
    if low > 0:
        response *= 1 - np.exp(-(f / low) ** 4)
    response *= np.exp(-(f / high) ** 4)
    x = np.fft.irfft(np.fft.rfft(x) * response, n)
    return x / max(0.001, np.sqrt(np.mean(x*x)))


def edge_fade(x, attack=.002, release=.008):
    x = x.copy()
    a = min(len(x), int(attack * SR))
    r = min(len(x), int(release * SR))
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if r:
        x[-r:] *= np.linspace(1, 0, r)
    return x


def add(bus, x, onset, gain=1.0, pan=0.0):
    start = int(round(onset * SR))
    if start < 0:
        x = x[-start:]
        start = 0
    length = min(len(x), N - start)
    if length <= 0:
        return
    x = x[:length]
    if x.ndim == 1:
        ang = (pan + 1) * np.pi / 4
        x = x[:, None] * np.array([np.cos(ang), np.sin(ang)])[None, :]
    BUS[bus][start:start + length] += x * gain


def stereo_delay(x, wet=.14, delay=.1875):
    # Short, rhythmically related echoes; deliberately avoids cavernous reverb.
    y = np.column_stack([x, x])
    for k in range(1, 5):
        d = int((delay*k + (.003 if k % 2 else 0)) * SR)
        if d < len(x):
            y[d:, k % 2] += x[:-d] * wet * .48 ** (k-1)
    return y


def kick():
    t = time(.45)
    f = 43 + 100 * np.exp(-t * 48)
    phase = 2*np.pi*np.cumsum(f)/SR
    x = np.sin(phase) * np.exp(-t*11)
    x += .18*np.sin(2*phase)*np.exp(-t*31)
    x += smooth_noise(.45, 700, 3500)*.09*np.exp(-t*170)
    return edge_fade(np.tanh(x*1.35)/1.35, .0006, .02)


def snare():
    t = time(.21)
    body = (.45*np.sin(2*np.pi*185*t)+.18*np.sin(2*np.pi*330*t))*np.exp(-t*35)
    hiss = smooth_noise(.21, 1200, 8200)*np.exp(-t*35)
    # Three little clap grains preceding a snare-like tail.
    grains = sum(np.exp(-np.maximum(t-d,0)*240)*(t>=d) for d in [0,.011,.022])
    clap = smooth_noise(.21, 800, 6500) * grains
    return edge_fade(body + .19*hiss + .17*clap, .0004, .02)


def hat(opened=False):
    duration = .15 if opened else .052
    t = time(duration)
    noise = smooth_noise(duration, 6200, 14500)
    metal = sum(np.sin(2*np.pi*f*t) for f in [6931, 8337, 10283]) / 3
    return edge_fade((noise*.75 + metal*.25)*np.exp(-t*(23 if opened else 75)), .0003, .008)


def rim():
    t = time(.065)
    return edge_fade((np.sin(2*np.pi*1483*t)*.55 + np.sin(2*np.pi*2371*t)*.20
                     + smooth_noise(.065, 2800, 11000)*.25)*np.exp(-t*125), .0003, .01)


def bass(note, duration=.42):
    t = time(duration)
    f = midi(note)
    phase = 2*np.pi*f*t
    tone = np.sin(phase)+.20*np.sin(2*phase)+.085*np.sin(3*phase)
    attack = 1-np.exp(-t*160)
    env = attack*np.exp(-t*2.2)
    return edge_fade(np.tanh(tone*1.25)*env, .001, .075)


def chord(notes, duration=1.8, softness=1):
    t = time(duration)
    x = np.zeros_like(t)
    for i, note in enumerate(notes):
        f = midi(note)
        # Warm electronic keys: fundamental-heavy with tiny detuning and tremolo.
        for detune, level in [(-.0018,.25),(0,.5),(.0018,.25)]:
            phase = 2*np.pi*f*(1+detune)*t
            x += level*(np.sin(phase)+.12*np.sin(2*phase)+.045*np.sin(3*phase))
        x += .018*np.sin(2*np.pi*f*4.005*t)*np.exp(-t*5)
    x /= np.sqrt(len(notes))
    env = (1-np.exp(-t*160)) * np.exp(-t*(2.4/softness))
    x *= env*(.98+.02*np.cos(2*np.pi*4.0*t))
    x = edge_fade(x, .002, .07)
    return stereo_delay(x, wet=.15)


def pluck(note, duration=.7):
    t = time(duration)
    f = midi(note)
    # A small glass/mallet punctuation, not a lead competing with typography.
    x = np.sin(2*np.pi*f*t+1.2*np.sin(2*np.pi*f*2*t)*np.exp(-t*16))
    x *= (1-np.exp(-t*400))*np.exp(-t*8)
    return edge_fade(x,.001,.035)


def sweep(at, duration=.38, gain=.15, reverse=False):
    t = time(duration)
    u = t/duration
    n = smooth_noise(duration, 300, 7200)
    envelope = np.sin(np.pi*u)**1.5
    # Moving harmonic gives the noise a smooth pitch gesture.
    hz = 230 + 1900*u*u
    phase = 2*np.pi*np.cumsum(hz)/SR
    x = (n*.65 + np.sin(phase)*.12) * envelope
    if reverse:
        x = x[::-1]
    x = edge_fade(x,.008,.015)
    pan = np.linspace(-.65,.65,len(x))
    ang = (pan+1)*np.pi/4
    add('transitions', np.column_stack([x*np.cos(ang),x*np.sin(ang)]), at, gain)


# 120 BPM, 30 beats. Short film sections align with the art edit.
# D Dorian establishes a playful minor sound without a menacing harmony.
progression = [
    (0.00, [50,57,60,64,65], .18),
    (1.50, [57,60,64,65], .08),
    (2.00, [55,59,62,64], .19),
    (3.25, [59,62,64,69], .10),
    (4.50, [50,57,60,64,65], .21),
    (5.75, [57,60,64,65], .09),
    (7.00, [55,59,62,64], .21),
    (8.50, [53,57,60,64], .17),
    (10.50,[50,57,60,64,65], .22),
    (11.75,[55,59,62,64], .12),
    (13.00,[50,57,60,64,65,69], .24),
]
for at, notes, gain in progression:
    add('music', chord(notes, duration=(2 if at == 13 else 1.8), softness=(1.8 if at == 13 else 1)), at, gain)

kick_times = [0, 1.50, 2,2.75,3,3.75,4.5,5.25,5.5,6.25,7,7.75,8,8.75,
              9.5,10.5,11.25,11.5,12.25,13]
for at in kick_times:
    add('drums', kick(), at, .65 if at != 13 else .76)

snare_times = [2.5,3.5,5,6,7.5,8.5,9.5,11,12]
for i, at in enumerate(snare_times):
    add('drums', snare(), at, .35 if i%3 else .38, pan=.025*(-1)**i)
    add('texture', rim(), at+.016, .065, -.32)

for i, at in enumerate(np.arange(1.0,12.75,.25)):
    if 9.75 <= at < 10.5 or at == 4.25 or at == 6.75:
        continue
    swing = .018 if i%2 else 0
    gain = .047 if i%2 else .062
    add('drums', hat(opened=(i%8==6)), at+swing, gain, -.26 if i%2 else .28)

# Small optional off-grid hats keep the loop human and clipped, not machine-gun busy.
for at in [3.875,6.125,8.875,11.875,12.625]:
    add('drums', hat(), at, .029, .4)

bass_events = [
    (0,38,.60),(1.5,45,.30),
    (2,43,.46),(2.75,43,.22),(3.25,47,.30),(3.75,45,.27),
    (4.5,38,.58),(5.25,45,.29),(5.75,48,.35),(6.25,41,.31),
    (7,43,.55),(7.75,43,.26),(8.25,47,.27),(8.75,45,.35),
    (9.5,41,.43),(10.5,38,.58),(11.25,45,.30),(11.75,43,.32),
    (12.25,45,.27),(13,38,1.75),
]
for at, note, dur in bass_events:
    add('bass', bass(note, dur), at, .21 if at!=13 else .24)

# A three-note signature repeats sparingly, then resolves upward on the final mark.
for at,note,gain,pan in [(0.12,74,.11,-.18),(.375,77,.075,.1),(.75,76,.08,.28),
                        (4.625,74,.11,-.18),(4.875,77,.075,.1),(5.25,76,.07,.28),
                        (10.625,74,.11,-.18),(10.875,77,.075,.1),(11.25,76,.08,.28),
                        (13.0,74,.13,-.12),(13.125,81,.075,.2)]:
    add('music', pluck(note), at, gain, pan)
    add('music', pluck(note), at+.375, gain*.15, -pan)

# Tactile type/camera accents cluster around visual typography gestures.
for i, at in enumerate([.06,.23,.41,1.70,1.82,4.16,4.30,6.65,6.79,10.13,10.28,
                        12.50,12.625,12.75,12.875]):
    add('texture', rim(), at, .055 + .015*(i%3==0), (-1)**i*.55)

for end, dur, gain in [(2,.38,.085),(4.5,.42,.105),(7,.44,.11),
                        (10.5,.62,.13),(13,.65,.15)]:
    sweep(end-dur,dur,gain)

# A short low-pitched, cinematic downlifter hits each cut without masking the groove.
for at,gain in [(0,.09),(4.5,.07),(7,.08),(10.5,.09),(13,.14)]:
    t=time(.62 if at!=13 else 1.60)
    f=45+150*np.exp(-t*13)
    x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*(8 if at!=13 else 3))
    add('transitions',edge_fade(x,.002,.04),at,gain)

# Final air tail: a restrained high shimmer, decaying before the exact 15 s end.
t=time(2.0)
tail=smooth_noise(2.0,4200,10000)*np.exp(-t*3.8)*(1-np.exp(-t*70))
add('transitions',stereo_delay(edge_fade(tail,.005,.16),wet=.18,delay=.12),13,.027)

# Subtle side-chain on music and bass creates headroom and a tactile kick shape.
duck=np.ones(N)
for at in kick_times:
    start=int(at*SR)
    td=time(.22)
    env=1-.32*np.exp(-td*15)
    length=min(len(env),N-start)
    duck[start:start+length]*=env[:length]
BUS['music']*=duck[:,None]
BUS['bass']*=duck[:,None]

# Master bus: gentle analogue-like saturation and no hard clipping.
mix=sum(BUS.values())
mix=np.tanh(mix*1.07)/1.07
mix-=np.mean(mix,axis=0)
# 12 ms leading edge and 160 ms trailing fade eliminate boundary clicks.
mix[:int(.003*SR)]*=np.linspace(0,1,int(.003*SR))[:,None]
mix[-int(.160*SR):]*=np.linspace(1,0,int(.160*SR))[:,None]
peak=float(np.max(np.abs(mix)))
mix*=10**(-1.2/20)/peak


def write_pcm24(path, audio):
    audio=np.clip(audio,-.999999,.999999)
    # TPDF dither at the 24-bit quantisation floor.
    dither=(RNG.random(audio.shape)-RNG.random(audio.shape))/(2**23)
    q=np.round((audio+dither)*(2**23-1)).astype(np.int32).reshape(-1)
    pcm=np.column_stack([q & 255,(q>>8)&255,(q>>16)&255]).astype(np.uint8)
    with wave.open(str(path),'wb') as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR)
        w.writeframes(pcm.tobytes())


out=ROOT/'AOK_15s_Original_Score.wav'
write_pcm24(out,mix)
qa={
    'path':str(out),'duration_seconds':DURATION,'sample_rate':SR,'channels':2,
    'bit_depth':24,'tempo_bpm':120,'beats':30,'sample_peak_dbfs':float(20*np.log10(np.max(np.abs(mix)))),
    'rms_dbfs':float(20*np.log10(np.sqrt(np.mean(mix*mix)))),
    'clipped_samples':int(np.sum(np.abs(mix)>=1)),
    'provenance':'Original procedural synthesis. No third-party samples, voices, or recordings.',
    'seed':260927,
}
(ROOT/'AOK_15s_Sound_QA.json').write_text(json.dumps(qa,indent=2)+'\n')
print(json.dumps(qa,indent=2))
