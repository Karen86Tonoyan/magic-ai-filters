# LIGHT_MODELS_EXTENDED — rozszerzona biblioteka oświetlenia

Dołącz do `light_models.md`. Używaj numeru lub nazwy w bloku [LIGHT_MODEL].

---

## WARIANTY STUDYJNE (parametry techniczne)

[LIGHT_MODEL 1 - górne fluorescencyjne]
Kąt: 45° z góry, temp: 6500K, intensywność: wysoka, fill: brak.
Efekt cieni: ostre, twarde pod oczami nosem i brodą, głębokie czarne worki,
czoło mocno prześwietlone, cienie płaskie bez gradacji, zielonkawy tint na skórze.

[LIGHT_MODEL 2 - jedno boczne okno lewa]
Kąt: 90° z lewej, temp: 5500K, intensywność: średnia-wysoka, fill: brak.
Efekt cieni: lewy policzek i żuchwa prawie bez cienia (spalone),
prawa strona twarzy w głębokim nieprzeniknionym czarnym cieniu,
ostry kontrast na nosie, prawe oko prawie niewidoczne.

[LIGHT_MODEL 3 - mieszane lampa + okno]
Lampa: 3200K z prawej (niski kąt), okno: 6500K z lewej, intensywność: równa.
Efekt cieni: podwójne cienie — żółte od lampy + niebieskie od okna,
zielonkawy shift w cieniach pod nosem i brodą,
asymetryczne worki pod oczami (prawy ciemniejszy), wyraźny konflikt kolorów.

[LIGHT_MODEL 4 - słabe górne + rim]
Główne: 5500K słabe z góry, rim: słaby z tyłu, intensywność: niska.
Efekt cieni: bardzo miękkie rozmyte cienie pod oczami i brodą,
twarz płaska i szara, minimalny cień tylko przy linii żuchwy,
rim light tworzy cienką srebrną linię na prawym uchu i ramieniu.

[LIGHT_MODEL 5 - up-light z dołu]
Kąt: 45° z dołu, temp: 3200K, intensywność: średnia, fill: brak.
Efekt cieni: długie dramatyczne cienie idące w górę,
cień nosa pada na czoło, cień brody na usta i policzki,
twarz wygląda niepokojąco, mocne podświetlenie nozdrzy i dolnej wargi,
ziemisty odcień, monster lighting.

---

## DAVE HILL GAMMA

[LIGHT_MODEL - Dave Hill GAMMA]
Dave Hill style: ekstremalny clarity + texture + local contrast, ale zniszczony Gamma.
Twarde kontrastowe światło studyjne z lewej-góry 45°,
lewy policzek mocno spalony z widocznym grainem,
prawa strona twarzy w głębokim czarnym cieniu bez detalu,
wysoki mikrokontrast, skóra szorstka, pory widoczne, zero glow,
kolory brudne, lekkie prześwietlenie na kości policzkowej, cienie czarne i ciężkie.

Wersja EN (do promptów angielskich):
Dave Hill style: extreme clarity, high microcontrast and texture,
hard dramatic lighting from left-upper 45°,
strong blown highlights on left cheekbone with visible grain,
deep crushed blacks on right side of face, no glow, no beauty,
raw and gritty skin texture.

---

## GAMMA LIGHT PAINTING

[LIGHT_MODEL - light painting podstawowy]
Light painting technique: hard moving light from left,
painted only left cheekbone and forehead,
strong blown highlights with visible grain,
rest of face in deep crushed black shadow,
uneven light strokes, raw and dirty.

[LIGHT_MODEL - light painting mocny]
Light painting: single moving flashlight,
painted only left side of face with quick uneven strokes,
extreme blown highlights on left cheek and nose,
right side completely black, high contrast, gritty texture, no fill light.

[LIGHT_MODEL - light painting bardzo brudny]
Light painting: erratic hand-held torch movement,
light hits only parts of face randomly,
strong overexposure on left cheekbone with film grain visible in highlights,
deep black shadows swallowing right eye and jaw,
imperfect messy light painting, raw documentary feel.

---

## HYBRYDA Dave Hill + GAMMA Light Painting

[LIGHT_MODEL - hybryda Dave Hill + light painting]
Hybrid Dave Hill + GAMMA light painting:
extreme microcontrast and texture like Dave Hill,
but created with erratic moving flashlight,
hard light painted unevenly from left-upper 45°,
strong blown highlights on left cheekbone with visible grain,
deep crushed blacks on right side of face,
messy light strokes, imperfect coverage,
raw and gritty skin, no clean beauty, high drama with visible imperfection.

Wersja hardcore:
Dave Hill style hybrid with GAMMA light painting:
extreme clarity, high local contrast and texture,
but light is hand-painted with moving torch — uneven messy strokes from left,
overexposed left cheek and forehead with embedded grain,
right half of face almost completely black,
chaotic light coverage, dirty and imperfect dramatic lighting.

---

## PROMPT GOTOWY — Dave Hill GAMMA (PL)

```
Ten sam mężczyzna: nos lekko skręcony w lewo, M-shaped zakola,
zarost łaciaty na prawym policzku, 3 blizny po goleniu na lewej szyi,
lewe oko niżej o ~3mm, prawe ramię niżej,
pory T-zone mocno powiększone, blackheads na nosie i brodzie,
asymetryczne głębokie worki pod oczami (prawy ciemniejszy),
tłusta błyszcząca strefa T vs sucha skóra na policzkach,
suche płatki przy brwiach, suche popękane kostki palców, brud pod paznokciami.

Dave Hill style: ekstremalny clarity i texture, ale surowy i brudny.
Twarde światło studyjne z lewej-góry 45°,
lewy policzek mocno spalony z widocznym grainem,
prawa strona twarzy w głębokim czarnym cieniu bez detalu,
wysoki mikrokontrast, skóra szorstka, zero glow,
kolory brudne, lekkie prześwietlenie na kości policzkowej.

Stoi przy ścianie bloku, ciężar na prawej nodze, lewa lekko zgięta,
bluza rozciągnięta przy kołnierzu, prawa kieszeń wypchana telefonem,
lewa paczka fajek.

Kadr lekko krzywy, głowa ucięta u góry, za dużo chodnika na dole.

Body: Nikon D700, 35mm f/4.8, ISO 400, 1/90s, raw documentary.

NEGATIVE: no beauty filter, no smooth skin, no symmetry, no plastic skin,
no AI glow, no perfect skin, no cinematic, no HDR, no retouching,
no over-sharpening, no denoise, no fashion look,
no influencer aesthetic, no idealized features.
```

---

## SERIAL CONSISTENCY (Fallen Guardian G-01)

Plan ujęć z wariantami oświetlenia:

SCENA 1 (intro):    [LIGHT_MODEL 1] — surowe fluorescencyjne, pot + pory
SCENA 2 (profil):   [LIGHT_MODEL 2] — boczne okno, połowa twarzy w czerni
SCENA 3 (dramat):   [LIGHT_MODEL 5] — up-light, monster lighting
SCENA 4 (studyjne): [LIGHT_MODEL - Dave Hill GAMMA]
SCENA 5 (chaos):    [LIGHT_MODEL - light painting bardzo brudny]

Identity lock G-01 (stały przez wszystkie sceny):
czarny płaszcz wełniany (zmechacenia na lewym ramieniu),
Casio F-91W (porysowane szkiełko),
blizna przecinająca lewą brew (głęboka u nasady),
przekrwione twardówki — wtórnie: niesymetryczne mrużenie + łzawienie w kąciku.
