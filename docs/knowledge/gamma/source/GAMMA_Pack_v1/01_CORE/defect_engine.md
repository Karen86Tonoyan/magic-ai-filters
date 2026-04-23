# DEFECT_ENGINE — generator wad biologicznych z logiką konsekwencji

Zasada główna: defekty nie są losowe. Wynikają z historii, nawyków i ograniczeń.
Każdy błąd ciągnie za sobą konsekwencje.

---

## NEGATIVE PROMPT (poprawiony — wklej zawsze)

```
no beauty filter, no smooth skin, no symmetry correction, no plastic skin,
no AI glow, no perfect skin, no cinematic lighting, no HDR, no retouching,
no over-sharpening, no denoise, no fashion look, no influencer aesthetic,
no studio polish, no clean composition, no model face, no digital clarity,
no idealized features
```

---

## KATEGORIE I LOSOWANIE

### WARSTWA 1: TWARZ — ASYMETRIA STRUKTURALNA
Losuj JEDNO:

| Defekt | Konsekwencje (muszą być) |
|--------|--------------------------|
| Nos skręcony w lewo | Prawa strona twarzy szersza, cień głębszy po lewej |
| Jedna brew stale wyżej | Czoło po tej stronie bardziej napięte, zmarszczki nierówne |
| Żuchwa cięższa z prawej | Głowa lekko przekrzywiona, napięcie szyi po lewej |
| Jedno oko niżej | Brwi niesynchroniczne, cienie pod oczami różne |

Reguła: jeśli coś jest krzywe — ciało to kompensuje.

---

### WARSTWA 2: SKÓRA — HISTORIA BIOLOGICZNA
Losuj 3-5 (nie wszystkie):

PODSTAWOWE:
| Defekt | Dlaczego | Gdzie dokładnie |
|--------|----------|-----------------|
| Zaskórniki | Tłusta dieta, stres | Nos, broda, czoło nad brwiami |
| Popękane naczynka | Alkohol, zimno, stres | Jeden policzek, skrzydełka nosa |
| Przebarwienia | Słońce, czas | Czoło nierówno, pod oczami |
| Mikrozacięcia po goleniu | Pośpiech, tępa maszynka | 2-4 miejsca, losowo |
| Sucha skóra | Zima, brak picia | Okolice oczu, szyja, brwi |

ROZSZERZONE (gotowe bloki do wklejenia):

[DEFECT_ENGINE - skóra v1]
Pory T-zone mocno powiększone, blackheads na nosie i brodzie,
suche płatki przy brwiach, broken capillaries na obu policzkach i skrzydełkach nosa,
asymetryczne głębokie worki pod oczami (prawy ciemniejszy),
3-4 czerwone krosty na lewym policzku, nierówna linia zarostu z przerwami,
mikro-zacięcia po goleniu na szyi z zaczerwienieniem, pojedyncze wągry na czole,
tłusta błyszcząca strefa T kontrastująca z suchą skórą na policzkach.

[DEFECT_ENGINE - skóra v2 — pełny]
Pory T-zone mocno powiększone, blackheads na nosie i brodzie,
suche płatki przy brwiach, broken capillaries na obu policzkach i skrzydełkach nosa,
asymetryczne głębokie worki pod oczami (prawy ciemniejszy),
3-4 czerwone krosty na lewym policzku, nierówna linia zarostu z przerwami,
mikro-zacięcia po goleniu na szyi z zaczerwienieniem, pojedyncze wągry na czole,
tłusta błyszcząca strefa T kontrastująca z suchą skórą na policzkach,
blizny potrądzikowe na policzkach, pieprzyki na brodzie i szyi,
nierówny rumień na lewym policzku, pojedyncze białe zaskórniki zamknięte na czole,
lekkie łuszczenie się skóry przy linii włosów.

[DEFECT_ENGINE - kondycja skóry ogólna]
Skóra: sucha i szorstka na policzkach z widocznym łuszczeniem,
tłusta i błyszcząca strefa T, nierówny rumień na lewym policzku,
popękane naczynka, matowa i zmęczona tekstura,
lekkie przebarwienia potrądzikowe, widoczne rozszerzone pory,
suche płatki przy linii włosów i brwiach, brak naturalnego blasku,
ziemisty odcień, drobne blizny potrądzikowe.

---

### WARSTWA 3: WŁOSY / ZAROST
Losuj JEDNO główne + JEDNO drugorzędne:

| Główne | Drugorzędne |
|--------|-------------|
| Zarost łaciaty (jedna strona rzadsza) | + linia szyi krzywa |
| Włosy sklejone z jednej strony | + jeden kosmyk odstaje |
| Nieudane strzyżenie (boki różnej długości) | + włosy na karku nieregularne |
| Łysienie — przerzedzone nad czołem | + reszta za długa, nieczesana |

ROZSZERZONE:

[DEFECT_ENGINE - włosy + owłosienie]
Włosy: M-shaped receding hairline z widocznymi zakolami,
przerzedzone na czubku, przetłuszczone u nasady z matowymi końcówkami,
kilka odstających kosmyków z lewej strony, nierówna linia włosów na karku.
Zarost: nierówna gęstość (łata na prawym policzku), pojedyncze siwe włosy w brodzie,
krzywa linia zarostu na szyi, wrastające włoski z czerwonymi kropkami po goleniu,
kępki włosów na uszach i nozdrzach.

[DEFECT_ENGINE - tekstura włosów]
Włosy: suche i szorstkie końcówki kontrastujące z tłustą nasadą,
splątane kosmyki z tyłu głowy, widoczne rozdwojone końcówki,
matowe pasma bez odbicia światła, pojedyncze łamliwe włosy sterczące na różne strony,
nierówna grubość włosów (cienkie przy skroniach, grubsze na czubku),
lekkie puszenie się przy wilgotności.

---

### WARSTWA 4: OCZY — NIESYNCHRONIZACJA
Losuj DWIE:

| Defekt | Efekt wizualny |
|--------|----------------|
| Jedno oko bardziej czerwone | Zmęczenie, niewyspanie, ekran |
| Różna wilgotność | Jedno błyszczy, drugie matowe |
| Minimalna różnica źrenic | Lekki stres, napięcie |
| Jedno oko "ostrzejsze", drugie płaskie | Spojrzenie nie trafia w obiektyw |

---

### WARSTWA 5: CIAŁO — POSTAWA KOMPENSACYJNA
Losuj JEDNO + konsekwencje:

| Defekt postawy | Konsekwencje fizyczne |
|----------------|----------------------|
| Ciężar na prawej nodze | Biodra krzywe, lewa noga napięta |
| Barki nierówne (jeden wyżej) | Szyja pochylona, głowa przekrzywiona |
| Plecy zaokrąglone | Głowa do przodu, barki zamknięte |
| Jedna ręka zawsze w kieszeni | Ta kieszeń wypchana, spodnie krzywe |

---

### WARSTWA 6: RĘCE / DŁONIE
Losuj 2-3:

| Defekt | Powód |
|--------|-------|
| Paznokcie różnej długości | Obgryzanie, brak czasu |
| Skórki uszkodzone | Nerwowe szarpanie |
| Mikroskaleczenia | Praca, brak ostrożności |
| Suche kostki | Zima, brak kremu |
| Brud pod paznokciami | Brak czasu |

ROZSZERZONE:

[DEFECT_ENGINE - kondycja dłoni]
Dłonie: suche, popękane kostki palców, zaczerwienione i podrażnione skórki,
widoczne żyły, matowa i szorstka skóra, brud pod paznokciami,
lekkie drżenie, żółtawe przebarwienia na opuszkach,
suche łuszczące się miejsca na kciukach, blizny po skaleczeniach,
nierówny kolor skóry, brak elastyczności.

[DEFECT_ENGINE - paznokcie v1]
Paznokcie: nierówne długości, poobgryzane skórki, żółtawe przebarwienia,
czarne ślady pod paznokciami, jeden paznokieć pęknięty na pół,
suche i popękane skórki wokół, biała plama na kciuku,
nierówne krawędzie po obcinaniu.

[DEFECT_ENGINE - paznokcie v2 — pełny]
Paznokcie: kruche i łamliwe, cienkie płytki z widocznymi pionowymi bruzdami,
żółtawe przebarwienia na kilku paznokciach, biała plama na kciuku,
jeden paznokieć pęknięty wzdłuż, suche i popękane skórki z zaczerwienieniem,
poobgryzane brzegi, brak połysku, matowe i szorstkie powierzchnie,
lekkie oddzielanie się płytki od łożyska na serdecznym palcu.

---

### WARSTWA 7: UBRANIE — ŚLAD DNIA
Losuj JEDNO główne + 2 detale:

| Stan ubrania | Detale (wybierz 2) |
|--------------|-------------------|
| Bluza rozciągnięta | kołnierz "pamięta" ciągnięcie / rękawy skręcone |
| Spodnie gniecione | wypchane kieszenie / materiał odciągnięty |
| T-shirt skręcony | fałdy w jednym miejscu / szew krzywy |
| Buty nierówno zużyte | jedna podeszwa ścierata / sznurówki różnej długości |

---

### WARSTWA 8: KIESZENIE — LOGIKA FIZYCZNA (OBOWIĄZKOWA)

| Jeśli w kadrze jest: | To MUSI być: |
|---------------------|--------------|
| Fajka w ustach | Paczka + zapalniczka w kieszeni (widoczne garby) |
| Telefon w ręce | Kieszeń bez telefonu (materiał płaski) |
| Klucze w dłoni | Kieszeń bez kluczy |
| Nic w rękach | Jedna kieszeń wypchana (telefon), druga lżejsza |

Reguła: rzeczy nie teleportują się. Jeśli czegoś brakuje — to AI.

---

### WARSTWA 9: STOPY (opcjonalne — gdy widoczne)

[DEFECT_ENGINE - kondycja stóp]
Stopy: suche i popękane pięty z głębokimi szczelinami,
żółtawe zgrubienia na palcach, brudne paznokcie u nóg
z widocznymi grzybicznymi przebarwieniami, odciski na podeszwach,
łuszcząca się skóra między palcami, czerwone podrażnienia od butów,
nierówny kolor skóry, widoczne żyły na wierzchu stopy,
brak elastyczności, matowa i szorstka powierzchnia.

---

### WARSTWA 10: ŚWIATŁO
Losuj JEDNO:

| Typ | Efekt na twarzy |
|-----|----------------|
| Boczne niskie (popołudnie) | Jedna strona spalona, druga brudny cień |
| Odbicie od samochodu | Żółtozielony odcień na policzku |
| Lampa sodowa (parking) | Żółta skóra, brak neutralności |
| Mieszane (słońce + LED) | WB nietrafiony, kolory się gryzą |

---

### WARSTWA 11: KADR — BŁĄD KTÓRY ZOSTAJE
Losuj DWA:

| Błąd | Dlaczego |
|------|----------|
| Krzywy horyzont | Ręka zadrżała, pośpiech |
| Obcięty łokieć | Telefon za blisko |
| Za dużo asfaltu | Ktoś wszedł od dołu, nie było czasu poprawić |
| Słup w tle | Nie zauważono, brak drugiego ujęcia |

---

## PROCEDURA UŻYCIA

1. Losuj z każdej warstwy zgodnie z instrukcją
2. Wybierz odpowiedni blok ROZSZERZONY jeśli chcesz więcej szczegółów
3. Sprawdź spójność: czy te defekty mogą współistnieć tego samego dnia?
4. Jeśli TAK użyj. Jeśli NIE losuj ponownie
5. Wklej do promptu jako konkretny opis, NIE jako listę wad

Zły format:
"realistic man with flaws"

Dobry format:
"nos lekko skręcony w lewo, prawa strona twarzy szersza, 3 mikrozacięcia po goleniu
na lewej szyi, zarost łaciaty po prawym policzku, lewe oko bardziej czerwone, ciężar ciała
na prawej nodze bo lewa boli od starej kontuzji, bluza rozciągnięta przy kołnierzu,
w prawej kieszeni wypchany telefon, w lewej klucze, światło boczne spala nos,
kadr krzywy bo ręka zadrżała"

---

## REGUŁA KOŃCOWA

Jeśli po przeczytaniu promptu możesz powiedzieć "to brzmi jak opis zdjęcia" — źle.
Jeśli możesz powiedzieć "to brzmi jak fragment dnia" — dobrze.
