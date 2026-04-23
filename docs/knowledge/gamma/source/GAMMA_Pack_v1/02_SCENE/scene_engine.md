# SCENE_ENGINE — moduł sceny dokumentalnej

Cel: zdefiniować jeden konkretny moment w czasie.
Nie "klimat", nie "estetykę" — co się dzieje, dlaczego, co jest w kieszeniach.

---

## SZABLON SCENY

```
SCENE_ENGINE:

MIEJSCE:
  - lokalizacja: [konkretna, nieestetyczna — parking / blok / przystanek / klatka]
  - stan miejsca: [zaniedbane / używane / ślady eksploatacji]
  - elementy przeszkadzające: [co jest w tle i przeszkadza w kadrze]

CZAS:
  Wybierz JEDEN stan biologiczny:
  [ ] po-sen (opuchlizna, dezorientacja)
  [ ] koniec dnia (opadnięcie, ciężkość)
  [ ] zimno (zaczerwienienie, napięcie)
  [ ] stres (szczęka zaciśnięta, oczy suche)
  [ ] alkohol (matowość skóry, dullness)
  [ ] pośpiech (nierówność, brak korekcji)

HISTORIA (5 minut wcześniej):
  - co robił: [konkretna czynność]
  - dlaczego stoi tak, a nie inaczej: [powód fizyczny]
  - kto zrobił zdjęcie: [przypadkowy / sam sobie / ktoś kazał]

KIESZENIE (obowiązkowe):
  - prawa kieszeń: [co dokładnie]
  - lewa kieszeń: [co dokładnie]
  - ręce: [puste / coś trzyma — wtedy kieszenie płaskie]

POWÓD ZDJĘCIA:
  - dlaczego zdjęcie w ogóle powstało: [przypadek / ktoś kazał / mimochodem]
  - czy miało znaczenie: NIE (jeśli TAK → AI)

FIZYKA POSTACI W SCENIE:
  - gdzie jest ciężar ciała: [która strona]
  - co sprawia dyskomfort: [konkretny powód]
  - co blokuje ruch: [ściana / auto / brak miejsca]
```

---

## LIGHT MODEL (wypełnij osobno dla każdej sceny)

```
LIGHT_MODEL:
  kierunek: [45° lewa / prawa / od góry / od dołu]
  intensywność: [nierównomierna — gdzie spala, gdzie brudny cień]
  kolor: [mieszany / zimny / sodowy / fluorescencyjny]
  efekt na twarzy: [co dokładnie robi złe światło z twarzą]
  WB: [błędny / mieszany / niekonsekwentny]
```

---

## BŁĄD KADRU (wybierz 2)

```
FRAME_ERROR:
  [ ] krzywy horyzont
  [ ] obcięty łokieć / dłoń
  [ ] za dużo asfaltu / podłogi
  [ ] przeszkadzający element w tle (słup / auto / znak)
  [ ] za ciasny kadr (twarz obcięta po bokach)
  [ ] zdjęcie w pół ruchu
```

---

## PRZYKŁAD GOTOWEJ SCENY

```
SCENE_ENGINE:

MIEJSCE: parking przy bloku, asfalt mokry po deszczu, w tle kontener na śmieci
         i fragment złego parkowania Opla Astry, szara płyta chodnikowa

CZAS: koniec dnia — twarz opadnięta, ciężkość pod oczami, brak napięcia mięśniowego

HISTORIA: czekał 40 minut na Beatę, jest zimno, stoi bo nie ma gdzie usiąść,
          poprosił przypadkowego przechodnia który i tak miał telefon w ręce

KIESZENIE:
  - prawa: Samsung S24 Ultra (wypychanie materiału)
  - lewa: paczka fajek + zapalniczka jednorazowa (dwa garby)
  - ręce: puste, jedna w kieszeni, druga bezwładna

POWÓD ZDJĘCIA: nie miało żadnego znaczenia

FIZYKA: ciężar na lewej nodze, prawa w luz, ramię prawe niżej (smartfon),
        stoi przy boku VW Scirocco — nie ma gdzie się ruszyć

LIGHT_MODEL:
  kierunek: boczne 45° prawe, niskie (popołudniowe)
  intensywność: prawa strona spalona na kości policzkowej, lewa w brudnym cieniu
  kolor: mieszany — zimne szaroniebieski z zewnątrz + reszta ciepłego sodu z neonu
  efekt: rysy twarzy psute przez kontrast, prawa strona przepalona
  WB: auto błędny — zimne i ciepłe gryzą się na twarzy

FRAME_ERROR:
  - krzywy horyzont (ręka zadrżała)
  - ucięta linia maski auta (ktoś wszedł od dołu kadru)
```

---

## REGUŁA KOŃCOWA

> Scena nie jest tłem dla postaci.
> Postać jest w scenie bo musiała tam być — nie dlatego że "pasowało".
> Jeśli miejsce można zamienić na inne bez straty — to AI.
