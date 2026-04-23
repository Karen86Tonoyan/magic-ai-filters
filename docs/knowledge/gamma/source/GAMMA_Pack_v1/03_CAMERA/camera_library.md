# CAMERA_LIBRARY — biblioteka sprzętowa pod GAMMA

Zasada użycia:
- wybierz 1 body + 1 lens ALBO 1 telefon (nie miksuj)
- każdy preset ma swoje wady — to jest zaleta
- stare / tanie → mniej walki z AI
- nowe / czyste → wymagają świadomego "psucia"

---

## 20 OBIEKTYWÓW

### SUROWE / STARE (najbardziej Gamma)
| Nr | Obiektyw | Charakter |
|----|----------|-----------|
| 1 | Helios 44-2 58mm f/2 | swirl bokeh, miękka ostrość, chaos tła |
| 2 | Pentacon 50mm f/1.8 | płaski kontrast, lekki "brud" |
| 3 | Canon FD 50mm f/1.8 | mleczna ostrość, stare kolory |
| 4 | Minolta Rokkor 45mm f/2 | miękko, lekki fade |
| 5 | Industar 50-2 | niski kontrast, "papierowy look" |
| 6 | Nikkor 35-70mm f/3.5 (vintage) | nierówny zoom, spadki jakości na krawędziach |
| 7 | Vivitar Series 1 70-210mm | ciężki, dziwny kontrast |
| 8 | Tamron Adaptall 28mm f/2.8 | dystorsja, edge blur |

### MID (kontrolowany realizm)
| Nr | Obiektyw | Charakter |
|----|----------|-----------|
| 9 | Canon EF 50mm f/1.8 STM | neutralny, łatwy do "psucia" |
| 10 | Nikkor 35mm f/1.8 DX | street, naturalny |
| 11 | Sigma 30mm f/1.4 Art | ostry, ale można degradować |
| 12 | Canon EF 24-105mm f/4 L | reportażowy feeling |
| 13 | Tamron 28-75mm f/2.8 | lekko miękki zoom |
| 14 | Sony 50mm f/1.8 FE | tani, trochę plastikowy look |

### NOWE / CZYSTE (do świadomego psucia)
| Nr | Obiektyw | Strategia |
|----|----------|-----------|
| 15 | Sigma 35mm f/1.4 Art | super sharp → psuć światłem |
| 16 | Sony 24-70mm f/2.8 GM | kliniczny → łamać WB |
| 17 | Canon RF 50mm f/1.2 | perfekcja → celowo degradować |
| 18 | Nikon Z 85mm f/1.8 | czysty portret → niszczyć symetrię |
| 19 | Sony 85mm f/1.4 GM | beauty killer → odwrócić logikę |
| 20 | Canon RF 28-70mm f/2 | "za dobry" → Gamma łamie |

---

## 20 APARATÓW (BODY)

### STARE / BRUTALNE
| Nr | Body | Charakter |
|----|------|-----------|
| 1 | Nikon D700 | **BASELINE GAMMA** — brudny RAW |
| 2 | Canon 5D Classic | miękki, ciepły |
| 3 | Canon 40D | ziarnisty, brzydki ISO |
| 4 | Nikon D90 | plastikowy kolor |
| 5 | Pentax K10D | dziwny WB |
| 6 | Olympus E-500 | mała matryca, harsh noise |
| 7 | Sony A100 | cyfrowy "stary vibe" |

### REPORTAŻ / REAL
| Nr | Body | Charakter |
|----|------|-----------|
| 8 | Canon 5D Mark II | klasyczny dokument |
| 9 | Nikon D750 | naturalny, ale nie sterylny |
| 10 | Sony A7 II | lekki chaos kolorów |
| 11 | Fujifilm X-T2 | filmowy, ale można złamać |
| 12 | Panasonic GH4 | video feel, cyfrowy |

### NOWE / DO PSUCIA
| Nr | Body | Strategia |
|----|------|-----------|
| 13 | Sony A7 IV | czysty → niszczyć |
| 14 | Canon R6 | bardzo dobry → degradować WB |
| 15 | Nikon Z6 II | neutralny → łamać symetrią |
| 16 | Sony A7R V | przesadna ostrość → blur krawędzi |
| 17 | Canon R5 | ultra clean → łamać światłem |
| 18 | Nikon Z8 | high-end → psuć WB |
| 19 | Fujifilm X-H2 | kolorystyka do kontroli |
| 20 | Sony FX3 | video cinematic → łamać Gamma |

---

## 20 TELEFONÓW

### STARE / GOLD (najlepszy brud)
| Nr | Telefon | Charakter |
|----|---------|-----------|
| 1 | iPhone 6 | miękko, słabo, idealnie dla Gamma |
| 2 | iPhone 7 | lekko lepiej, dalej real |
| 3 | Samsung Galaxy S7 | kontrast dziwny |
| 4 | Huawei P9 | Leica fake, ale ciekawy |
| 5 | LG G4 | dziwny HDR |
| 6 | Sony Xperia Z5 | zimny look |
| 7 | Nokia Lumia 1020 | specyficzny detal, stary feel |

### MID (najlepszy balans real/kontrola)
| Nr | Telefon | Charakter |
|----|---------|-----------|
| 8 | iPhone X | nadal real |
| 9 | iPhone 11 | trochę AI, ale ok |
| 10 | Samsung S10 | social media look |
| 11 | Pixel 4 | computational, ale kontrolowalny |
| 12 | Huawei P30 | agresywny processing |
| 13 | OnePlus 8 | neutralny |
| 14 | Xiaomi Mi 9 | lekki chaos |

### NOWE (TRZEBA ŚWIADOMIE PSUĆ)
| Nr | Telefon | Strategia |
|----|---------|-----------|
| 15 | iPhone 13 Pro | za ładny → psuć WB i grain |
| 16 | iPhone 14 Pro | HDR zabija realizm → spłaszczać |
| 17 | iPhone 15 Pro | clean killer → grain +25 |
| 18 | Samsung S23 Ultra | overprocessed → noise filter |
| 19 | Pixel 8 Pro | AI smoothing → texture boost |
| 20 | Xiaomi 14 | mocna obróbka → degradować |

---

## GOTOWY BLOK DO PROMPTU

```
[CAMERA_BASELINE]
Body: Nikon D700
Lens: Helios 44-2 58mm f/2
ISO: 400
Shutter: 1/90s
White Balance: incorrect / mixed
Artifacts: noise, chromatic aberration, edge blur
Style: raw documentary, no beautification
```

Alternatywny (tani / telefon):
```
[CAMERA_BASELINE]
Device: iPhone 7 / Samsung Galaxy S7
Lens: wide angle + slight distortion
ISO: random high
Artifacts: compression noise, chromatic aberration, motion blur
Style: accidental street photo, no intent
```

---

## STRATEGIA WYBORU

```
Scena brutalna (parking / ulica / brud)     → stary body + stary lens
Scena komercyjna (produkt natural)          → mid body + mid lens + psuć WB
Scena "prawie reklama"                      → nowy body + ŚWIADOME psucie
Seryjność / ciągłość postaci                → jeden zestaw przez cały serial
```

---

## PRO TIP

Nie chodzi o sprzęt — chodzi o pipeline:
- stary sprzęt = mniej walki z AI
- nowy sprzęt = więcej kontroli + więcej pracy nad degradacją

Najważniejsze: **jeden zestaw sprzętowy przez cały serial**.
Zmiana body między ujęciami = sygnał AI.
