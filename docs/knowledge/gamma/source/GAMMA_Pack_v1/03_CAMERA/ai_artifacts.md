# AI_ARTIFACTS — gdzie AI "pęka" i jak naprawiać

Zasada: nie naprawiaj wszystkiego.
Zostaw 10-20% błędów — ale kontrolowanych i logicznych.
To daje realizm.

---

## MAPA ARTEFAKTÓW (priorytet naprawy)

### 1. TWARZ — TOP 1 źródło błędów

**Oczy:**
- nierówne źrenice
- różna ostrość między oczami
- "szklane" spojrzenie
- brak mikro-żyłek

Naprawa:
- dodaj lekki noise + micro D&B
- NIE wybielaj oka za mocno
- zachowaj przekrwienia

**Skóra:**
- plastikowa gładkość
- powtarzalny pattern porów (największy tell)
- "AI glow" (dziwne halo wokół twarzy)

Naprawa:
- grain + texture boost
- rozbij powtarzalność (clone + noise na wzorze)
- grain musi być nierówny, nie uniform

**Usta / zęby:**
- zęby jak "copy-paste"
- brak głębi między zębami
- za białe

Naprawa:
- przyciemnij przestrzenie między zębami
- obniż brightness zębów
- dodaj lekki shadow

---

### 2. WŁOSY — drugi killer

Typowe artefakty:
- włosy wchodzące w skórę
- brak logicznych kierunków wzrostu
- "dym zamiast włosów" przy krawędziach

Naprawa:
- rozbij linię włosów (nie może być równa)
- dodaj pojedyncze odstające włosy
- lekki blur na krawędzi włos/tło

---

### 3. RĘCE — najgorsze

Artefakty:
- palce o różnej długości
- dziwne złączenia przy dłoni
- brak stawów
- paznokcie z kosmosu

Naprawa:
- jeśli ręka jest kluczowa → popraw manualnie (Liquify)
- jeśli nie → ukryj częściowo (Gamma trick: kieszeń, cień, obcięcie kadrem)

**PRO TIP:** w Gamma ręce często są w kieszeni lub nieczytelne — to nie błąd, to realizm.

---

### 4. UBRANIA

Artefakty:
- tekstury "płyną" (zwłaszcza przy ruchach)
- brak napięcia materiału
- logo rozjechane lub fałszywie symetryczne
- nienaturalne zagięcia (za regularne)

Naprawa:
- D&B na fałdach (podkreśl logiczne napięcie)
- dodaj deformację przy kieszeni (telefon wypycha materiał)
- logo: lekki blur + noise (ukrywa błędy)

---

### 5. OBIEKTY (telefon, zegarek, klucze)

Artefakty:
- deformacje perspektywy
- brak symetrii w prostych kształtach
- "rozmyte detale" na ekranach i tarczach

Naprawa:
- lekki blur + noise (ukrywa błędy)
- NIE próbuj robić perfekcji (wyglądałoby sztucznie)
- częściowe zasłonięcie dłonią / cieniem — naturalne

---

### 6. TŁO — cichy zabójca

Artefakty:
- "rozpływające się" detale w głębi
- brak powtarzalności (np. okna różnej wielkości)
- dziwne cienie bez źródła
- za czyste / za puste

Naprawa:
- grain na tle (musi pasować do postaci)
- lekki Gaussian blur
- dodaj chaos: losowy element (kabel, kosz, znak)

---

### 7. ŚWIATŁO — bardzo częste

Artefakty:
- cień nie pasuje do kierunku źródła
- różne kierunki światła na tej samej twarzy
- brak spójności kolorów temp (zimne + ciepłe bez logiki)

Naprawa:
- wybierz jedno główne źródło
- resztę traktuj jako "błąd" — ale spójny z tym źródłem
- nie naprawiaj złego WB — to jest zaleta

---

### 8. KRAWĘDZIE (edge) — halo i wycięcie

Artefakty:
- halo wokół postaci (jasna aureola)
- "wycięty" efekt (za czyste kontury)
- za ostre granice postać/tło

Naprawa:
- lekki blur na krawędziach (0.3-0.8px)
- noise na granicy (rozbija precyzję)
- lekka aberracja chromatyczna

---

## PATTERN ROZPOZNAWANIA (najważniejszy wzór)

```
jeśli coś jest:
  za czyste       → podejrzane
  za symetryczne  → podejrzane
  za ostre        → podejrzane
  za jednolite    → podejrzane
```

---

## TEST GAMMA (przed eksportem)

```
Czy skóra wygląda "ładnie"?          → ❌ popraw
Czy coś wygląda jak stock photo?     → ❌ popraw
Czy wygląda jak reklama?             → ❌ popraw
Czy wygląda jak przypadkowe zdjęcie? → ✅ OK
```

---

## MODELE (ranking realizm vs plastik)

| Model | Realizm | Plastik | Gamma score |
|-------|---------|---------|-------------|
| FLUX | wysoki | niski | 8.5/10 |
| SD 1.5 | średni | niski | 7.5/10 |
| DeepFloyd | wysoki | średni | 7/10 |
| SDXL | średni | średni | 6/10 |
| RealisticVision | wysoki (fake) | wysoki | 4/10 |

**Najlepszy stack Gamma:**
```
FLUX (base realism)
+ IPAdapter (identity)
+ ControlNet (fizyka)
+ Gamma Fix (noise + chaos)
```

**CFG — najważniejszy parametr:**
```
> 7  = AI look
4-6  = natural
```

---

## COMFYUI MINIMAL FLOW

```
Checkpoint (SDXL / FLUX)
 → CLIP Text (Gamma prompt + negative)
 → IPAdapter (identity lock, weight 0.6-0.8)
 → ControlNet (pose: strength 0.4-0.7)
 → KSampler (CFG 4-6, steps 25-35)
 → Face Detailer (denoise 0.3-0.5 — lekko!)
 → Noise + Color shift
 → Save Image
```

**Parametry KSampler:**
```
Steps: 25-35
CFG: 4-6
Sampler: DPM++ 2M Karras
Denoise: 0.8-1.0
```

---

## NAJWIĘKSZY HACK

Zamiast poprawiać AI — **psuj je kontrolowanie:**
- złe światło
- lekki blur
- grain
- asymetria

To daje realizm, którego nie da się osiągnąć "naprawianiem".
