# DESIGN_SYSTEM — system kolorów i designu (HUMAN LOOK)

Zasada: PERFEKCYJNY KOLOR = SZTUCZNY. ZABRUDZONY KOLOR = REALNY.

---

## DLACZEGO "WEB WYGLĄDA JAK AI"

- kolory za czyste (RGB perfect)
- kontrast za idealny
- wszystko za równe
- brak "brudu kontekstowego"

Człowiek robi: niedoskonałości + mieszanie tonów + mikro-chaos.

---

## SYSTEM KOLORÓW (3 warstwy)

### WARSTWA 1 — BASE (tło)
```css
/* NIGDY: #000000 lub #ffffff — za płaskie */

--black-primary:    #0b0b0b;   /* główne tło */
--black-secondary:  #111111;   /* karty / elementy uniesione */
--black-tertiary:   #1a1a1a;   /* granica widoczności */

--white-primary:    #f3f3f1;   /* tekst na ciemnym */
--white-secondary:  #f5f4f2;   /* tło jasne (rzadko) */
```

### WARSTWA 2 — PRIMARY (emocja brandu)
```css
/* Nigdy czysty — zawsze "brudny" */

/* GOLD / BLACK (premium, Twój system) */
--gold-main:        #c6a85a;   /* główny akcent */
--gold-dirty:       #9f8443;   /* cień złota, subtelności */
--gold-highlight:   #e7d38a;   /* max 5% użycia */
--shadow-tint:      #2a2a1f;   /* zielonkawy cień — KLUCZ */

/* TECH REAL */
--blue-main:        #4a7c8c;
--blue-dirty:       #3a5f6b;
--shadow-tech:      #1c2a2f;

/* ORGANIC RAW */
--green-main:       #6f7c5b;
--green-dirty:      #4e5a3f;
--accent-organic:   #8a6f4d;

/* STREET / BRUTAL */
--red-main:         #a84a3a;
--red-dirty:        #6a2f28;
--accent-street:    #8c6b3f;
```

### WARSTWA 3 — CONTAMINATION (sekret human look)
```css
/*
Każdy kolor musi mieć lekko przesunięty ton.
Złoto + zielonkawy cień = bardziej realne niż czyste złoto.
*/

/* Przykład dla gold/black: */
.shadow-area {
  color: #c6a85a;
  filter: hue-rotate(15deg) saturate(0.85);
  /* = dirty gold, nie RGB gold */
}
```

---

## ZASADY ŁĄCZENIA KOLORÓW

```
1 kolor dominujący (80%)
1 kolor brudny (15%)
1 kolor highlight (5%)
```

❌ BŁĄD: 5 kolorów + gradienty + glow
✅ DOBRZE: 80% neutral / 15% główny / 5% highlight

---

## TYPOGRAFIA

```css
/* HEADINGS */
font-family: 'Satoshi', 'Helvetica Now', 'Inter Tight', sans-serif;
font-weight: 700;
font-size: clamp(48px, 8vw, 120px);
letter-spacing: -0.04em;    /* tight — premium signal */
line-height: 1.1;

/* BODY */
font-family: 'Inter', sans-serif;
font-size: 16-18px;
letter-spacing: -0.01em;
line-height: 1.5;

/* LABELS / SMALL */
font-size: 12px;
letter-spacing: 0.08em;     /* wide — kontrast do headingów */
text-transform: uppercase;
color: var(--white-secondary);
opacity: 0.6;
```

---

## LAYOUT LOGIC

```css
/* Duże marginesy */
--space-section:  clamp(80px, 12vw, 160px);
--space-content:  clamp(24px, 4vw, 64px);

/* Asymetria (lekka) */
.hero-text {
  margin-left: 8%;          /* NIE 50% centered */
  max-width: 55%;
}

/* Jedno na sekcję */
/* NIE upychaj elementów */
/* Dużo powietrza = premium signal */
```

---

## DESIGN TOKEN SYSTEM (CSS Custom Properties)

```css
:root {
  /* PRZESTRZEŃ */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   32px;
  --space-xl:   64px;
  --space-2xl:  128px;

  /* KOLORY — GOLD/BLACK */
  --bg:         #0b0b0b;
  --bg-alt:     #111111;
  --text:       #eaeaea;
  --text-muted: #8a8a8a;
  --accent:     #c6a85a;
  --accent-low: #9f8443;

  /* BORDERS */
  --border:     1px solid rgba(198, 168, 90, 0.15);

  /* TRANSITIONS */
  --ease:       cubic-bezier(0.16, 1, 0.3, 1);
  --duration:   400ms;
}
```

---

## OBRAZ + KOLOR (klucz do human look)

```
kolor UI musi POCHODZIĆ ze zdjęcia
```

Jeśli zdjęcie ma zielone cienie + ciepłe światło → UI MUSI to mieć.

Procedura:
1. Wygeneruj/wybierz zdjęcie GAMMA style
2. Pobierz dominant colors (np. Coolors.co / Photoshop eyedropper)
3. Zbuduj paletę z tych kolorów — nie z palety "premium"
4. UI staje się spójne z obrazem

---

## ŚWIATŁO W UI (70% efektu)

AI robi: czyste, równe światło.
Ty robisz: MIXED LIGHT.

```css
/* Zamiast prostego box-shadow: */
.card {
  box-shadow:
    0 1px 3px rgba(0,0,0,0.4),
    0 8px 24px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(198, 168, 90, 0.08);  /* subtelny złoty top */
}

/* Gradient tła — niewidoczny ale obecny */
body {
  background: radial-gradient(
    ellipse at 20% 0%,
    #1a1a14 0%,        /* lekko zielonkawy top-left */
    #0b0b0b 60%
  );
}
```

---

## COPY SYSTEM (tekst który sprzedaje)

```
NIE: "I am designer"
NIE: "Creative solutions"
NIE: "See my projects 🚀"

TAK:
"I don't design luxury. I expose it."
"Most people fake reality. I remove the filter."
"If you want perfect — don't write."
"If you want real — contact."
```

Zasada: jeśli coś wymaga emoji, tekst jest za słaby. Emoji = skrót emocji. Twój styl = prawdziwa emocja bez skrótu.

---

## PALETY GOTOWE DO UŻYCIA

### GOLD / BLACK
```
#0b0b0b / #eaeaea / #c6a85a / #9f8443
```

### TECH REAL
```
#0f1113 / #dcdcdc / #4a7c8c / #3a5f6b
```

### ORGANIC RAW
```
#121311 / #e5e3df / #6f7c5b / #8a6f4d
```

### STREET / BRUTAL
```
#0d0d0d / #f0f0f0 / #a84a3a / #8c6b3f
```

---

## STYL REKLAMOWY — REAL vs FAKE

❌ FAKE: idealne światło, czysty produkt, symetria, zero kontekstu
✅ HUMAN: produkt w użyciu, lekki chaos, światło niedoskonałe, brak hero shot

```
HUMAN LOOK =
(brudny kolor + złe światło + kontekst + asymetria)
-
(perfekcja + symetria + czystość)
```

---

## FILM PRESET: FUJI SUPERIA 400

```
[CAMERA / FILM SYSTEM - FUJI SUPERIA 400]
Fuji Superia X-Tra 400, C-41, slight overexposure +0.5 stop,
vivid saturated colors with strong green bias (greens pop, shadows green-tinted),
warm skin tones but cool overall cast,
medium-coarse organic grain embedded in emulsion,
higher contrast than Portra, snappy reds and yellows,
slight halation on highlights, imperfect color separation.
```

Użyj zamiast Kodak Portra gdy chcesz: bardziej żywe kolory, mocniejszy kontrast, wyraźniejszy green bias w cieniach.

---

## REGUŁA KOŃCOWA

```
Styl to nie to co dodajesz.
Styl to to co konsekwentnie odrzucasz.

Wartość rośnie gdy jesteś rozpoznawalny po jednym screenie.
```
