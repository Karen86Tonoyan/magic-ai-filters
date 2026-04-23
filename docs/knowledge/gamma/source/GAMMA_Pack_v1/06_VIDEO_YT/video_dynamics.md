# VIDEO_DYNAMICS — fizyka ruchu, dźwięk, 10 shortów (serial consistency)

Cel: video AI nie może być płynne. Musi mieć opór materii.
Większość AI video (Sora, Kling, Runway) zawodzi przez "liquid motion" — ruch zbyt płynny, "pływający".

---

## MOTION ENGINE — FIZYKA RUCHU

### 1. Bezwładność i ciężar (Physics of Mass)

```
[MOTION_ENGINE]
Coat physics: heavy wool coat has LAG
- if subject turns → coat reacts 0.2s delayed
- if subject walks → coat swings with weight, not like fabric

Posture compensation:
- slight loss of balance on uneven floor
- micro-stumbles: "shifting weight due to old knee injury"
- body decompresses between active moments

Hand tremor (fatigue/stress):
- visible when lighting cigarette (flame unstable)
- lighter: first attempt fails
- 1-2% micro-tremor on extended arm
```

### 2. Camera operator — człowiek, nie gimbal

```
[CAMERA_ARTIFACTS_VIDEO]
handheld jitter: 0.5-1.5° random per second
focus hunting:   slight blur when subject moves → "searches" back to focus
no smooth tracking: imperfect pan, jerky reframe
depth of field:  shallow — background decompresses randomly

Avoid:
- stabilized footage (looks AI)
- perfect tracking shots
- smooth zoom
```

### 3. Dym, oddech, fizyczne ślady ruchu

```
Smoke:
- thick, yellowish (not white)
- lingers, does not dissipate cleanly
- drifts in unexpected direction (draft)

Breath:
- visible in cold (irregular rhythm)
- audible in quiet moments (ASMR-level)
- asymmetric — one nostril slightly louder

Coat movement:
- delayed physics
- fabric pulls at left pocket (cigarette pack weight)
- collar slightly lifted by wind → falls unevenly
```

---

## SOUND ENGINE — BRUDNY DŹWIĘK

### Zasada

Test 4 walidatora: "Can you smell the place?" — dźwięk musi BUDOWAĆ fizyczne środowisko.

### Ambient (tło)

```
UŻYWAJ:
- low-frequency transformer hum (buczenie 50Hz)
- rain on metal (not clean, not continuous)
- distant siren (single, not looping)
- bus brakes (irregular, real recorded)
- fluorescent buzz (sodium lamp specific)

NIE UŻYWAJ:
- stock ambient sounds (too clean)
- music from lo-fi pack
- symmetrical loops
```

### Foley (detal)

```
FIZYCZNE DŹWIĘKI (przesterowane, bliskie):
- wool fabric on concrete — rough texture
- keys hitting each other in pocket
- cigarette lighter — first fail, second catch
- shoe on wet asphalt — specific squelch
- phone screen tap — slightly cracked screen sound different

DŹWIĘKI ZŁOTA (dla Black/Gold):
- gold on gold: low metallic scrape (not ring, not ping)
- two heavy metal plates grinding
- not musical — industrial
```

### Audio-video sync

```
ZASADA: napis pojawia się 1 klatkę PO dźwięku
- mózg słyszy "uderzenie" → szuka przyczyny → napis
- nie jednocześnie
```

---

## 10 SHORTÓW — SERIAL CONSISTENCY (Guardian archetype)

### GLOBAL IDENTITY LOCK (stały — NIE ZMIENIAJ)

```
- cheap black coat (left pocket stretched, cigarette pack shape visible)
- Casio F-91W watch (scratched, worn strap)
- small scar under right eyebrow
- slightly crooked nose (leans left)
- right eyelid heavier (subtle droop)
- posture: weight on right leg, left shoulder lower
- smokes irregularly
```

---

### SHORT 01 — PRZYSTANEK

```
[SOUND] bus brakes squeal, wet asphalt, wind

[SCENE]
stoi za blisko krawężnika, but lekko w wodzie, nie zauważa

[MOTION] minimal sway, przenosi ciężar na prawą nogę

[INCIDENT] autobus rozpryskuje wodę → krople na obiektywie

[CAMERA] handheld, slightly tilted, subject not centered

[TYPO] "WAIT" — gold, scratched, partially reflects light
```

---

### SHORT 02 — KLATKA SCHODOWA

```
[SOUND] echo kroków, neon buzz, distant door

[SCENE] stoi między piętrami, jakby zapomniał po co wszedł

[MOTION] minimal hesitation, hand on railing without gripping

[INCIDENT] light flickers → 1/24s his face revealed worse

[CAMERA] frame krzywy, focus szuka

[TYPO] "UP" — black, absorbs light, barely visible
```

---

### SHORT 03 — SKLEP NOCNY

```
[SOUND] lodówka humming, kasjer kaszel w tle

[SCENE] trzyma monetę ale nie podaje, decision paralysis

[MOTION] slight tremor in hand (fatigue)

[INCIDENT] ktoś przechodzi między nim a kamerą (blur)

[CAMERA] from side angle, not frontal

[TYPO] "CHANGE" — gold, smudged on right edge
```

---

### SHORT 04 — PRZEJŚCIE PODZIEMNE

```
[SOUND] kroki + kapanie wody, distant echo

[SCENE] idzie ale zwalnia bez powodu, no destination feeling

[MOTION] micro blur przy każdym kroku

[INCIDENT] migające światło → 1/24s face exposed

[CAMERA] tracking but imperfect, slight lag

[TYPO] "LOW" — dirty gold, barely above floor level
```

---

### SHORT 05 — AUTOBUS

```
[SOUND] silnik, plastic seat squeak, metal rattles

[SCENE] siedzi ale nie opiera się do końca, guard up

[MOTION] głowa lekko opada → wraca (micro sleep jerk)

[INCIDENT] streetlights cutting across face rhythmically

[CAMERA] from seat beside, too close, no composition

[TYPO] "PASS" — white, word-level, then gone
```

---

### SHORT 06 — ULICA / DESZCZ

```
[SOUND] rain on concrete, single car passing

[SCENE] mokry rękaw, papieros gaśnie w deszczu

[MOTION] próbuje zapalić → fail → second attempt

[PHYSICS] dym ciężki, niski, idzie w twarz od wiatru

[CAMERA] wide, subject not centered, excess sky

[TYPO] "TRY" — scratched gold, partially rained on
```

---

### SHORT 07 — SKLEP / LUSTRO

```
[SOUND] fluorescent buzz, distant refrigerator

[SCENE] widzi się w lustrze ale nie patrzy długo

[MOTION] focus shifts from reflection to object on shelf

[INCIDENT] camera focus goes to reflection → returns to real

[CAMERA] accidental double frame (mirror + subject)

[TYPO] "SEE" — split between mirror and real side
```

---

### SHORT 08 — KLATKA / DRZWI

```
[SOUND] klucz na metal, muffled TV from inside

[SCENE] stoi przed drzwiami, nie otwiera od razu

[MOTION] minimal hesitation, 2-3 seconds of nothing

[INCIDENT] neighbor's light turns on upstairs

[CAMERA] from behind, slightly above, no eye contact

[TYPO] "ENTER" — gold, as if etched into door metal
```

---

### SHORT 09 — POKÓJ

```
[SOUND] cisza + oddech + distant city

[SCENE] stoi w środku, nie zapala światła, acclimatizing

[LIGHT] tylko z ulicy, auto przejeżdża → light sweep on face

[INCIDENT] headlight sweep reveals full face for 0.5s

[CAMERA] from doorway, partial obstruction (door edge)

[TYPO] "STAY" — barely visible in shadow, low opacity
```

---

### SHORT 10 — OKNO (FINAŁ)

```
[SOUND] wiatr + odległe miasto, nothing specific

[SCENE] stoi przy oknie, nie patrzy w dół ani w górę — absent

[MOTION] prawie brak, micro-breathing movement only

[INCIDENT] (none — this is the absence of incident)

[CAMERA] frame niedoskonały (ucina głowę lekko), too much window

[TYPO] "REAL" — plain white, no effects, last word
```

---

## VIDEO PROMPT (dla Sora/Kling/Runway)

```
Generate a raw documentary sequence.

Subject: [PASTE IDENTITY LOCK HERE]

Motion must include:
- slight body sway
- uneven balance (old knee injury)
- delayed cloth physics (heavy coat lag)
- hand tremor when lighting cigarette
- micro-stumbles on uneven floor

Environment behaves independently:
- passerby interrupts frame (blur)
- distant window light appears randomly
- cat or moving element in background (not staged)

Light:
- flickering neon or sodium lamp
- reveals skin imperfections in 1/24s bursts
- no continuous clean lighting
- WB conflict (warm + cold)

Camera:
- handheld jitter (0.5-1.5°)
- focus hunting after movement
- imperfect framing
- slight blur during movement
- lens smudges, grain, compression artifacts

Smoke:
- thick, yellowish
- lingers, does not dissipate cleanly
- drifts against subject

Typography:
- words as physical objects in scene
- scratched gold texture, reacts to scene light
- black absorbs detail
- slow drift, not static overlay
- appears 1 frame AFTER audio cue

Reject:
perfect motion, cinematic smoothness, clean lighting,
beauty look, symmetry, influencer style, stabilized camera

If output looks polished or designed → regenerate
```

---

## SERIAL PRODUCTION RULES

```
Każdy short:
IDENTITY = ten sam (stały)
SCENE    = zmienna (nowe miejsce)
LIGHT    = agresywne (zawsze destruktor)
CAMERA   = niedoskonałe (zawsze)
TYPO     = fizyczne (zawsze)
INCIDENT = obowiązkowy (minimum 1 per short)

Ciągłość nie jest storytellingiem.
Ciągłość to OBECNOŚĆ w różnych momentach tego samego życia.
```
