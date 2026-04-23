# TYPO_ENGINE — typografia jako fizyczny obiekt (YouTube/Shorts)

Zasada: napisy nie są "naklejką" na filmie.
Muszą być fizycznym intruzem — podlegają tym samym prawom co obraz.

```
TEST WALIDACJI:
1. Czy napis wygląda, jakby można go dotknąć i pobrudzić ręce?
2. Czy litery mają wady?
3. Czy tekst PSUJE kadr zamiast go zdobić?

Jeśli nie przechodzi → przepisz
```

---

## HIERARCHIA FONTÓW (Black & Gold)

### PRIMARY FONT — The Monument
```
Cinzel / Cormorant Garamond / Playfair Display
Kiedy: autorytet, ujawnienie prawdy, finał
Styl: szeryfowy, eroded (zniszczony), heavy
```

### SECONDARY FONT — The Tech
```
Courier New / JetBrains Mono / IBM Plex Mono
Kiedy: dane techniczne, raporty, "dowód"
Styl: monospace, sugeruje raport/fakt
```

### DISPLAY (Hooks/Impact)
```
Inter Tight / Satoshi / Helvetica Now (Bold)
Kiedy: szybkie uderzenia, word-by-word rhythm
Letter-spacing: -0.04em (tight) dla headingów
```

---

## GOLD MATERIAL PHYSICS (fizyka złota w tekście)

```
Złoto NIE świeci jednolicie:
- hot spots: ostre punkty odbicia w losowych miejscach
- dead zones: fragmenty całkowicie czarne, matowe
- micro-scratches: widoczne zarysowania (grunge texture mask)
- fingerprint residue: dulls surface in smear pattern
- directional scratches: react differently to each light angle

INTERACTION Z SCENĄ:
- jeśli postać przechodzi przed napisem → maskowanie (zasłonięcie)
- jeśli postać trzyma światło → złoto zmienia kąt odbicia
- jeśli neon miga → złoto miga W TYM SAMYM RYTMIE
```

---

## GAMMA DEGRADATION (niszczenie napisów)

```
Chromatic Aberration:
- rozszczepienie na krawędziach liter
- delikatny fiolet + zieleń
- sugeruje starą soczewkę

Motion Blur (manual, nie smooth):
- ruch napisu = rozmycie zgodne z shutter speed kamery
- żadnych idealnie ostrych krawędzi w ruchu

Flicker:
- jasność ±2-3% w rytm otoczenia
- naśladuje niestabilność taśmy filmowej lub neonów sceny

Variable Grain:
- mocniejszy w cieniach
- słabszy w świetle
- nie uniform
```

---

## TYPO_ENGINE_SPEC (format dla modelu)

```
[TYPO_ENGINE_SPEC]
text:      "SILENCE IS GOLDEN"
font:      Cinzel Decorative (heavy, high-contrast)
texture:   scratched gold foil on matte black base
animation: impact drift (zoom 1.05x → slow stop)
degradation: 15% chromatic aberration, 5% grain overlay
audio_link: low frequency sub-bass thud, 1 frame before text appears
placement: lower-left, partially cut by frame edge
interaction: reacts to neon flicker in scene
```

---

## 4 TRENDY NAPISÓW (YouTube 2026)

### TREND 1: GLITCHED ELITISM
```
Złoty szeryfowy font → "przeskakuje" (glitch)
→ RGB split (błękit + czerwień rozwarstwiają się)
→ wraca do normalnego

Kiedy: kluczowy moment "ujawnienia prawdy"
Dźwięk: sharp electronic stutter
```

### TREND 2: KINETIC MINIMALISM
```
Word-by-word rhythm (rytm mowy)
Kolor: matowe białe lub dirty gold
Każde słowo: "pop" (skalowanie 90% → 100% w 2 klatkach)
Brak koloru, brak emoji, brak komiksowości
Silny cień (nie Drop Shadow — ambient occlusion)

Kiedy: cały czas trwania wypowiedzi
Dlaczego działa: mózg czyta + słucha = wyższa retencja
```

### TREND 3: SUBMERGED TEXT
```
Napis ZA obiektem (kolumna, ściana, postać)
Jeśli postać się porusza → napis jest zasłaniany
Efekt: głębia 3D, napis jest CZĘŚCIĄ przestrzeni

Twoim styl: złote litery świecące w mroku,
            schowane za czarną teksturowaną ścianą
```

### TREND 4: CINEMATIC MYSTERY (thumbnails 2026)
```
Mało tekstu, jeden ekstremalnie mocny punkt świetlny
Font: Extended (szeroki), lowercase (pewność siebie)
Przykład: "failure" lub "the end" (małe litery, extended)
Brak strzałek, brak "Tego NIE wiedziałeś o..."
```

---

## HOOKI (pierwsze 2 sekundy)

### HOOK 1: Visual Contrast
```
Obraz: extreme close-up on eye (broken capillaries visible),
       złota moneta w odbiciu
Tekst: "KŁAMALI CI." (białe, małe litery Inter, wide spacing)
Dźwięk: nagłe odcięcie tła — totalna cisza
```

### HOOK 2: Physical Weight
```
Obraz: ręka w czarnym rękawie rzuca złotą sztabkę
       stół drży, kurz unosi się w świetle
Tekst: "TO NIE JEST DLA WSZYSTKICH."
       (Cinzel, dirty gold)
Dźwięk: potężne basowe THUD + metaliczny pogłos
```

### HOOK 3: Vulnerable Power
```
Obraz: Guardian w ciemności, neon wyciąga każdą zmarszczkę,
       poprawia kołnierzyk
Tekst: "NAJDROŻSZA LEKCJA MOJEGO ŻYCIA."
Dźwięk: słyszalny ciężki wydech (ASMR-level)
```

### HOOK 4: The Freeze Frame
```
W najważniejszym momencie:
- obraz staje (freeze) na 5 klatek
- czarno-biały (zostaje tylko złoto)
- dźwięk: low-pass filter (stłumiony)
- potem wraca normalnie

Sygnał dla mózgu: ZAPAMIĘTAJ TO
```

---

## 20 POWER WORDS (Black & Gold)

```
WORD        | FONT          | MOTION            | DŹWIĘK
------------|---------------|-------------------|------------------
SILENCE     | Cinzel Heavy  | slow fade in      | sub-bass hum
ORIGIN      | Cormorant     | rise from bottom  | stone scrape
REAL        | Inter Tight   | static, no motion | none
WEIGHT      | Playfair Bold | falls slightly    | heavy thud
COST        | Courier       | typewriter        | mechanical click
FAIL        | Inter Light   | flicker, dim      | static burst
TRUTH       | Cinzel        | very slow zoom    | deep resonance
NOW         | Inter Black   | instant cut       | sharp impact
LAST        | Cormorant     | slow dissolve     | nothing
BUILT       | Playfair Bold | grows from center | metallic clang
DIRT        | Courier       | glitch split      | scratch
STAY        | Inter Thin    | barely visible    | breath
WATCH       | Monospace     | blink, 0.5s off   | camera click
MINE        | Cinzel Heavy  | static, gold only | none
EARNED      | Cormorant     | rises, heavy      | iron weight
BROKEN      | Inter Tight   | glitch horizontal | glass crack
ZERO        | Monospace     | typewriter 0      | flat tone
LEFT        | Playfair      | exits frame left  | wind
HEAVY       | Inter Black   | falls, compresses | floor impact
END         | Cinzel        | slow zoom in      | silence
```

---

## STRATEGIA TREŚCI (Black & Gold na YouTube)

```
MINIATURA:
- Twarz w GAMMA style (zmęczenie, pot, złoty detal)
- głęboka czerń wokół
- jeden napis: "FAILURE" lub "THE END"
- font: szeroki (extended), lowercase, white

OTWARCIE (zamiast "Cześć"):
- milczenie 1.5s
- fizyczny gest (rzucenie obiektu)
- napis pojawia się "WIDZĘ CIĘ"

MONTAŻ:
- ciężki i OSZCZĘDNY (nie przeładowany efektami)
- każde złote słowo "waży tonę"
- 3 overlaye: dust & scratches + film halation + variable grain
```

---

## OVERLAYE PRODUKCYJNE (3 obowiązkowe)

```
1. DUST & SCRATCHES
   pyłki latające w świetle
   tło nie jest "puste" — jest "głębokie"

2. FILM HALATION
   czerwona poświata wokół najjaśniejszych (złotych) punktów
   cecha fizycznej taśmy — AI nie naśladuje bez instrukcji

3. VARIABLE GRAIN
   mocniejszy w cieniach, słabszy w świetle
   klucz do GAMMA-REALISM
   NIE uniform grain
```

---

## SCENARIUSZ SHORT 30s — "THE COST OF GOLD"

```
[0:00-2s]   BLACK FRAME → metaliczny zgrzyt
            Napis biały Inter: "PRZESTAŃ."

[2:00-10s]  Ty w GAMMA-REALISM style
            1 zdanie o porażce która buduje
            word-by-word gold napisy (klatka piersiowa level)

[10:00-25s] Szybki montaż przebitek:
            złoty płyn / pęknięty beton / dłoń w pięść
            W rytm bicia serca (sub-bass)
            Każdy cięcie + THUD + złote słowo

[25:00-30s] Twoje logo — złota folia / matowa czerń
            Dźwięk gaszącej lampy
```

---

## REGUŁA KOŃCOWA

```
Napisy muszą PSUĆ kadr, nie dekorować go.
Jeśli wygląda jak nałożone w Premiere Pro → FAIL
Jeśli wygląda jak fizyczny obiekt w przestrzeni → PASS

Większość przegrywa bo przeładowuje.
Ty wygrywasz bo każde złote słowo jest ciężkie.
```
