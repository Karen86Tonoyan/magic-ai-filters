# FILM_ANALOG_SYSTEM — system analogowy dla GAMMA

Cel: symulacja chemii i mechaniki analogowej — nie jako efekt, jako materiał.
Grain musi być EMBEDDED w strukturze obrazu, nie nałożony jako overlay.

---

## ZASADA GŁÓWNA

```
Grain embedded ≠ Grain overlay

Grain overlay = AI look
Grain embedded = grain fizycznie merging z porami, bliznami, teksturą skóry
```

---

## MASTER PROMPT (analog execution stack — gotowy do wklejenia)

```
raw documentary realism, no staging, no aesthetic intent, moment captured not constructed,

image produced through hybrid system: mechanical Leica M6 behavior with
Summicron-M 35mm f/2 ASPH rendering logic merged with digital sensor discipline,
Kodak Portra 400H film simulation overexposed +1 stop and push processed +1 stop,
ISO 800 equivalent, organic heavy grain embedded into full image structure,
not applied as overlay, grain physically merging with skin texture, pores and scars,
subtle lens flare, imperfect contrast roll-off, slight exposure inconsistency as from manual shooting,

[wstaw BIOMETRIC LOCK + SCENE tutaj]

lighting follows analog physics: harsh key light at 45° from left side, strong falloff,
left cheekbone partially blown but retaining grain and underlying skin structure due to film latitude,
right side sinking into dense shadow with partially crushed blacks, loss of detail in beard mass,
shadows contaminated with green and violet tonal shifts from push processing,
mixed white balance conflict between cold ambient daylight and warm sodium light,
no correction applied, color instability preserved,

scene exists as fragment of reality: environment slightly imperfect, minor dust, uneven surfaces,
no clean staging, tonal transitions organic, blacks not pure, highlights not sterile,
colors slightly dirty and inconsistent, subtle imperfections from film development process
including minor chemical irregularities and scan artifacts,

final rendering rejects all artificial enhancement: no polish, no cinematic grading,
no symmetry correction, no beauty logic, no HDR behavior, no glow,
no digital sharpening or denoise, no influencer or fashion aesthetic,
no idealization, only biological truth, randomness, and physical imperfection
preserved as primary visual language
```

---

## 10 PRESETÓW FILMÓW

### 1. Kodak Portra 400H (Twój baseline)
```
Kodak Portra 400H overexposed +1 stop, push processed +1,
warm skin tones, heavy grain embedded, soft shadow detail,
slight magenta in highlights, green contamination in shadows
```

### 2. Kodak Portra 800
```
Kodak Portra 800, ISO 1600 push, coarse grain,
muddy shadows, color shift toward yellow in midtones,
skin texture amplified
```

### 3. Kodak Tri-X 400 (czarno-biały)
```
Kodak Tri-X 400 pushed to 1600, high contrast, deep blacks,
harsh grain structure, no middle grey comfort,
brutal skin texture
```

### 4. Ilford HP5 (czarno-biały)
```
Ilford HP5 overexposed, softer grain than Tri-X,
flat midtones, detail retention in highlights,
slightly gentler but still raw
```

### 5. Cinestill 800T (nocny)
```
Cinestill 800T, tungsten balanced, orange halation around lights,
blue shadows, high grain, neon contamination,
urban night documentary
```

### 6. Kodak Gold 200 (tani, brudny)
```
Kodak Gold 200, overexposed, cheap processing,
orange tint, compressed shadows, color inconsistency,
"disposable camera" feel
```

### 7. Fuji Superia 400
```
Fuji Superia 400, green/teal bias, cooler skin tones,
medium grain, slightly lower contrast than Portra
```

### 8. Fuji Pro 400H
```
Fuji Pro 400H, cool neutral tones, minimal grain,
but pushed +2 = grain emerges, blue shadows
```

### 9. Expired Film (chaos)
```
expired color film, color shift unpredictable,
grain heavy and clumping, light leaks possible,
chemical fog in shadows, temporal decay visible
```

### 10. Cross-processed slide
```
E6 film processed in C41, extreme color distortion,
cyan shadows, orange/magenta highlights, grain violent,
high contrast, no neutrality
```

---

## RANDOMIZER ANALOGOWY (wariacje systemu)

Dodaj jeden z tych bloków do promptu dla unikalności każdej sceny:

### Błędy chemii:
```
minor chemical inconsistencies from development bath,
slight silver retention in shadows,
micro-density variations across frame
```

### Błędy skanowania:
```
subtle scan artifacts, dust particles at frame edge,
minor Newton rings in one corner,
scanner light slightly uneven
```

### Błędy mechaniki:
```
light leak from camera back hinge — warm edge contamination,
slightly uneven frame advance — overlap at left edge,
shutter curtain slight vibration — micro-blur at 1/60
```

### Błędy ekspozycji (ręczna):
```
slight underexposure from manual metering error,
one stop darker than intended,
shadow detail partially lost — not recovered
```

---

## KONWERSJA: DAVE HILL → ANALOG

Dave Hill = kontrolowana perfekcja (clarity, HDR, D&B masking).
Analog = materiał chemiczny, nie cyfrowy efekt.

```
Krok 1: Hill (baza)
  Clarity +50, Texture +25, Contrast +20
  → daje "mięso" (detal, mikrokontrast)

Krok 2: Analog conversion
  Dodaj grain (heavy, embedded style)
  Zniszcz WB (shift toward green/yellow)
  Przywróć asymetrię skóry
  Blur krawędzi (film diffusion)
  Saturacja -10 to -20
  Color cast chemiczny

Krok 3: Chaos
  Jedna z losowych wariacji z randomizera powyżej
```

---

## KSAMPLER — PARAMETRY POD ANALOG

```
CFG:     4.5 – 6.5   ← kluczowe
Steps:   20-30       (nie więcej — przeiterowanie = AI look)
Sampler: DPM++ 2M Karras
Denoise: 0.75-0.85
```

---

## HARDCORE MODE (jeśli chcesz maksimum)

Dodaj na końcu każdego promptu:

```
imperfect scan, slight film dust, minor chemical inconsistencies,
subtle color unevenness from development process,
grain clumping in shadow areas, halation around highlight edges
```

---

## REGUŁA KOŃCOWA

```
Prompt z "grain overlay" = AI look
Prompt z "grain embedded into skin structure, merging with pores" = analog truth

Różnica: czy grain jest EFEKTEM czy MATERIAŁEM
```
