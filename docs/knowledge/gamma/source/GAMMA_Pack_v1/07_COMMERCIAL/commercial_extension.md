# COMMERCIAL_EXTENSION — reklama, która nie wygląda jak reklama

Pozycjonowanie: **"Looks accidental. Sells intentional."**

---

## BLOK COMMERCIAL_INTENT

Dodaj do każdego promptu reklamowego:

```
[COMMERCIAL_INTENT]
product: (zegarek / bluza / telefon / buty / etc.)
visibility: LOW / MEDIUM / HIGH
integration: natural / accidental / background
focus_priority: human (primary) vs product (secondary)
```

### Poziomy widoczności:

**LOW** — produkt "żyje w scenie", prawie niewidoczny
→ wygląda jak: "to nie reklama"

**MEDIUM** — produkt widoczny, ale nie centralny
→ np. zegarek widoczny tylko przy ruchu ręki

**HIGH** — produkt czytelny, ale:
❌ brak pozowania pod produkt
❌ brak highlights jak w reklamie klasycznej

---

## REGUŁY PRODUKTU (KRYTYCZNE)

```
1. Produkt NIE może wyglądać na wstawiony
2. Produkt MUSI być logiczną częścią sceny
3. Produkt NIE może być najczystszym elementem kadru
4. Produkt dziedziczy warunki świata (światło, brud, blur, kąt)
5. Produkt może być częściowo zasłonięty — to jest zaleta
```

---

## PRODUCT_INTEGRATION (dodaj do SCENE_ENGINE)

```
[PRODUCT_INTEGRATION]
- gdzie jest produkt fizycznie (kieszeń / ręka / stół / szyja)
- co robi ciało względem produktu (trzyma / nosi / ignoruje)
- czy produkt deformuje ubranie (tak → lepiej)
- czy produkt jest częściowo zasłonięty (tak → lepiej)
- czy produkt ma ślady użytkowania (tak → lepiej)
- czy odbicia / refleksy psują czytelność (tak → lepiej)
```

---

## AD VALIDATOR (rozszerzenie binary_validator)

Dodatkowe pytania TAK/NIE po standardowym teście:

```
Czy produkt wygląda jak część życia?           TAK = OK / NIE = FAIL
Czy można usunąć produkt i scena ma sens?      TAK = OK / NIE = FAIL
Czy produkt jest za czysty wobec świata?       TAK = FAIL
Czy produkt jest centralnym punktem kadru?     TAK = FAIL
Czy produkt wygląda jak specjalnie wstawiony?  TAK = FAIL
```

---

## PRZYKŁAD: KAMPANIA ZEGAREK

```
[IDENTITY_LOCK]
ten sam mężczyzna: skręcony nos, zmęczone oczy, M-shaped hairline,
nierówny zarost, asymetria żuchwy

[COMMERCIAL_INTENT]
product: zegarek (Casio F-91W, srebrny)
visibility: MEDIUM
integration: accidental

[SCENE_ENGINE]
stoi przy aucie, czeka, ciężar na prawej nodze,
lewa ręka w kieszeni (telefon deformuje materiał),
prawa ręka opuszczona — zegarek widoczny tylko przy ruchu dłoni,
nie patrzy w kamerę, ktoś zrobił zdjęcie za wcześnie

[PRODUCT_INTEGRATION]
zegarek na prawym nadgarstku, częściowo w cieniu rękawa,
nie wycentrowany w kadrze, pasek lekko zużyty na sprzączce,
odbicie światła z lakieru auta psuje czytelność tarczy

[LIGHT_MODEL]
światło odbite od maski auta — prawa kość policzkowa spalona,
lewa w brudnym cieniu, WB mieszany (ciepły + zimny)

[NEGATIVE]
no beauty filter, no product highlight, no clean advertising look,
no symmetry, no studio lighting, no watch hero shot
```

---

## 4 GOTOWE CASE'Y (kategorie)

### CASE 1 — "Parking / waiting" (ubrania, zegarki, lifestyle)
Stoi przy aucie, nie patrzy w kamerę, coś sprawdza.
Światło odbite od auta. "Ktoś zrobił zdjęcie przypadkiem."

### CASE 2 — "Room / chaos" (tech, produkty codzienne)
Pokój, lekki bałagan, siedzi na łóżku/krześle.
Telefon/laptop. Zmęczenie. Produkt w tle lub w ręce.

### CASE 3 — "Street / transition" (streetwear, brandy młodzieżowe)
Idzie. Ktoś go złapał w ruchu. Lekki blur.
Nie patrzy. Produkt noszony, nie trzymany.

### CASE 4 — "Break / pause" (edgy brandy, niche)
Przerwa. Napięcie. Brak pozowania.
Produkt leży obok lub jest użytkowany, nie eksponowany.

---

## PIPELINE DLA FOTOGRAFA / AGENCJI

```
Brief klienta
    ↓
Gamma Scene Generator (wybór case'a)
    ↓
Prompt (identity + scene + product_integration)
    ↓
Generacja (FLUX / SDXL)
    ↓
Gamma Validator + AD Validator
    ↓
Selekcja (3 warianty)
    ↓
Final asset
```

---

## REALISM CONTROL (dla klienta)

```
LOW    → trochę niedoskonałości (komercja mainstream)
MEDIUM → natural (real-life brand)
HIGH   → Gamma brutal realism (niche, edgy, autentyczność)
```

---

## NAJWIĘKSZY EDGE

Większość robi: **product hero shot**
Ty robisz: **product accidentally exists**

To jest różnica między reklamą a dokumentem.
Klient płaci za dokument, który sprzedaje.
