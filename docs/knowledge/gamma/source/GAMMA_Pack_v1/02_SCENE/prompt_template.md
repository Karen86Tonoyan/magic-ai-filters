# PROMPT_TEMPLATE — gotowe szablony do wklejenia w model

---

## SZABLON MINIMALNY (jedno ujęcie)

```
[TOŻSAMOŚĆ + HISTORIA RZECZY],
znajduje się w [NIEESTETYCZNE MIEJSCE],
[STAN BIOLOGICZNY: zmęczenie / zimno / stres],
stoi/siedzi bo [KONKRETNY POWÓD — czeka / ktoś kazał / nie wie co zrobić],
prawa kieszeń: [CO], lewa kieszeń: [CO],
postawa: [DYSKOMFORT — opis fizyczny],
światło: [OPIS ATAKU ŚWIATŁA NA TWARZ],
kadr: [BŁĄD — krzywy / obcięty / przeszkadzający element],
zdjęcie powstało mimochodem i nie miało żadnego znaczenia.
```

---

## SZABLON PEŁNY (serial / tożsamość locked)

```
IDENTITY_LOCK:
[skopiuj z identity_lock.md — NIE MODYFIKUJ między ujęciami]

DEFECTS (PRIMARY — LOCKED):
[lista 3-4 głównych wad z konsekwencjami]

DEFECTS (SECONDARY — TEXTURE):
[lista 2-3 wad tekstury]

SCENE:
[opis sceny z scene_engine.md]

CAMERA:
Body: Nikon D700, Lens: 24-50mm f/4.8, ISO: 300, Shutter: 1/90s,
WB: mixed/incorrect, Style: raw documentary

LIGHT:
[opis z LIGHT_MODEL]

NEGATIVE:
no beauty filter, no skin smoothing, no symmetry correction,
no cinematic polish, no perfect skin, no HDR, no influencer look,
no studio lighting, no model face, no retouching, no emotional clarity
```

---

## FILTR JĘZYKOWY (przed wklejeniem — zamień)

| ❌ AI-speak | ✅ GAMMA-speak |
|------------|---------------|
| "stylowy" | "nosi od lat" |
| "realistyczny" | "nie miał czasu" |
| "klimat" | "nie wiedział co zrobić" |
| "portret" | "zdjęcie w pośpiechu" |
| "ładny" | "nie miało znaczenia" |
| "street photography" | "ktoś już trzymał telefon" |
| "authentic" | "bo tak wyszło" |

---

## PRZYKŁAD GOTOWY DO WKLEJENIA

```
Ten sam mężczyzna co w poprzednich ujęciach — nos lekko skręcony w lewo,
zakola M-shape, zarost łaciaty na policzkach, 3 blizny po goleniu na lewej szyi,
lewe oko niżej o ~3mm, prawa kurtka z Lidla którą nosi od 3 lat bo nie przeszkadza —

stoi krzywo na parkingu przy bloku bo żona kazała poczekać z torbami,
w prawej kieszeni Samsung S24 Ultra (widoczne wypychanie materiału),
w lewej paczka fajek + zapalniczka jednorazowa (dwa garby),
ręce puste — jedna w kieszeni, druga bezwładna,
ciężar ciała na lewej nodze, prawa w luz, prawe ramię niżej,
twarz po całym dniu — worki, opadnięcie, brak napięcia,

światło boczne z prawej od neonu Żabki — prawa kość policzkowa spalona,
lewa strona twarzy w brudnym zimnym cieniu, WB błędny — zimne i ciepłe gryzą się,

kadr krzywy (ktoś zawołał w połowie), ucięta linia maski Opla w tle,
zdjęcie zrobione mimochodem bo telefon był już w ręce i nie miało żadnego znaczenia.

Body: Nikon D700, 35mm f/4.8, ISO 300, 1/90s, WB auto błędny.

NEGATIVE: no beauty filter, no smooth skin, no symmetry correction,
no cinematic, no HDR, no studio, no model face, no perfect lighting,
no retouching, no influencer aesthetics.
```

---

## REGUŁA KOŃCOWA

> Dobry prompt do modelu obrazowego brzmi jak raport świadka zdarzenia,
> nie jak opis kompozycji fotograficznej.
>
> Jeśli czytając prompt widzisz "zdjęcie" → przepisz.
> Jeśli widzisz "człowiek w konkretnym momencie" → wklejaj.
