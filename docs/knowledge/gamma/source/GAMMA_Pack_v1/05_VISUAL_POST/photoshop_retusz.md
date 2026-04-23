# PHOTOSHOP_RETUSZ — workflow Gamma (brutal realism)

Cel: kontrolujesz KTÓRE wady zostają — nie usuwasz wszystkich.
Zasada: retusz NIE polega na "usunięciu wad" — tylko na zarządzaniu nimi.

---

## ZASADA GŁÓWNA

```
jeśli coś wygląda "za dobrze" → cofnij
jeśli scena wygląda jak reklama → popraw
jeśli wygląda jak przypadkowe zdjęcie → zostaw
```

---

## WORKFLOW KROK PO KROKU

### 1. RAW / PODSTAWA (Camera Raw / ACR)
```
Texture:          +10 do +30     (podbija prawdę skóry)
Clarity:          +5 do +15      (lokalny kontrast)
Noise Reduction:  MINIMALNY      (nie czyść!)
Dehaze:           0 lub lekko +
White Balance:    lekko NIETRAFIONY (Gamma lubi błędny WB)
```
NIE czyść zdjęcia. Ma być "żywe".

### 2. FREQUENCY SEPARATION (ale nie beauty)
Ruszasz TYLKO low frequency (kolor):
- wyrównujesz plamy kolorystyczne
- lekko uspokajasz czerwienie

NIE ruszasz:
❌ tekstury (high frequency)
❌ porów
❌ skin smoothing

### 3. DODGE & BURN (rdzeń retuszu Gamma)
```
Layer: Soft light curves
Brush: mały, low flow 1-3%
```
Co robisz:
- podbijasz mikro-cienie w porach
- wzmacniasz asymetrię (nie wyrównujesz)
- podkreślasz zmęczenie pod oczami
- modelujesz światło — NIE upiększasz

Zasada: zamiast wygładzać → modelujesz.

### 4. SKÓRA = MAPA, NIE POWIERZCHNIA
Zostaw:
✅ pory
✅ drobne przebarwienia
✅ lekkie zaskórniki
✅ teksturę ogólnie

Usuń TYLKO:
- kurz na matrycy (techniczne artefakty)
- pojedyncze artefakty AI (powtarzalne patterny)

### 5. OCZY (nie beauty)
- lekko podbij kontrast tęczówki
- zostaw przekrwienia
- zostaw zmęczenie
- NIE wybielaj jak influencer
Oczy mają być "żywe", nie "czyste".

### 6. GLOBALNE PSUCIE (kluczowe)
```
Grain:                    +10 do +25
Color shift:              lekki zielony / żółty cast
Aberracja chromatyczna:   subtelna
Blur krawędzi:            minimalny (rozbija "wycięty" look)
```
To zabija "AI clean".

### 7. ŚWIATŁO (Gamma rule)
- jedna strona może być przepalona
- albo zbyt ciemna
- NIE wyrównuj idealnie
Światło ma psuć twarz, nie służyć jej.

---

## FINAL CHECK (binary)

```
Skóra wygląda "ładnie"?          → ❌ popraw (za bardzo wygładzone)
Coś jest za symetryczne?          → ❌ popraw
Wygląda jak reklama?              → ❌ popraw
Wygląda jak przypadkowe zdjęcie?  → ✅ OK
```

---

## GOTOWY PRESET (skrót)

```
Texture +20
Clarity +10
Noise reduction: minimal
Grain +15
WB: lekko nietrafiony
No skin smoothing
Dodge & burn: micro
Leave imperfections
Color shift: +zielony/żółty
```

---

## 20 TECHNIK (od real do brutal)

### NATURAL / REAL (Gamma-friendly)
1. **Micro Dodge & Burn** — Soft light, brush 1-3% → modelujesz pory
2. **Color-only Frequency Separation** — tylko LOW → wyrównujesz kolor
3. **Grain Overlay** — Add Noise + Overlay → zabija plastik
4. **Uneven Color Correction** — Color Balance (zielony/żółty) → brudny realizm
5. **Patch Tool (minimal)** — tylko duże artefakty, NIE czyść skóry
6. **Texture Boost (ACR)** — Texture +20 → podbija prawdę skóry
7. **Local Contrast Map** — Clarity lokalnie → twarz "żyje"

### KOMERCYJNY REAL (reklama, ale nie plastik)
8. **Soft Frequency Separation** — LOW + HIGH → delikatne wygładzenie
9. **Skin Tone Unify** — Selective Color → wyrównanie czerwieni
10. **Controlled Blur Mask** — Gaussian blur + mask → tylko wybrane partie
11. **Light Sculpting** — Dodge & Burn globalny → "ładny", ale naturalny
12. **Eye/Face Contrast Balance** — oczy lekko mocniej → fokus na twarz
13. **Subtle Sharpen** — High Pass 1-2px → kontrola detalu

### BEAUTY (żebyś wiedział czego NIE robić)
14. **Skin Smoothing (Surface Blur)** → plastik
15. **AI Skin Retouch (Neural)** → za idealne, zawsze psuć
16. **Full FS + blur** → klasyczny beauty look
17. **Glow Effect (Orton)** → "AI glow"
18. **Skin Gradient Cleanup** → usuwa mapę skóry

### GAMMA / BRUTAL REALISM
19. **Imperfection Restore** — ręcznie DODAJESZ plamy, zaczerwienienia
20. **Chaos Layer** — grain + color shift + slight blur → kontrolowany błąd

---

## GOTOWE KOMBINACJE

**GAMMA CORE:**
```
Micro D&B + Grain + Color shift + Texture boost
```

**REKLAMA (Twoja nisza):**
```
Soft FS + Light D&B + Slight grain + Minor imperfection restore
```

**ANTY-AI FIX:**
```
Remove smoothing + Add grain + Break symmetry + Uneven color
```

---

## DAVE HILL → GAMMA (workflow zaawansowany)

Dave Hill look = kontrolowana perfekcja (clarity, HDR, D&B).
Gamma = kontrolowany brak kontroli.

Najlepszy wynik: **Hill jako baza → Gamma jako final.**

```
Krok 1 — zrób Hill (bazę):
  Clarity +50, Texture +25, Contrast +20

Krok 2 — zniszcz perfekcję:
  Exposure uneven (przepal jedną stronę)
  WB lekko błędny
  Przywróć zaczerwienienia i asymetrię
  Delikatny blur na krawędziach
  NIE wszystko ostre

Krok 3 — dodaj chaos:
  Grain +20
  Lekka aberracja chromatyczna
  Drobny błąd kadru (jeśli można)
  Saturation -10
  Color cast (green/yellow)
```

---

## BACKGROUND (tło)

Tło musi reagować na świat — te same parametry co postać:
```
[BACKGROUND_MODEL]
environment: used, imperfect, functional
details: random objects, slight mess, non-decorative
surfaces: uneven walls, stains, wear
depth: foreground obstruction + mid subject + background layer
lighting: inconsistent, one side stronger
noise: matches subject grain level
WB: matches subject (błędny, mieszany)
no clean walls, no minimalism, no symmetry
```

Test tła:
```
Ktoś by to posprzątał przed zdjęciem? → TAK = za czyste ❌
Tło ma sens funkcjonalny?             → NIE = sztuczne ❌
Tło jest mniej ważne niż człowiek?    → NIE = za mocne ❌
```
