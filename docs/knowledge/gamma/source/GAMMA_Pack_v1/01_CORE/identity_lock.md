# IDENTITY_LOCK — moduł tożsamości postaci

Cel: zdefiniować stałe cechy postaci, które NIE ZMIENIAJĄ SIĘ między ujęciami.
Używaj tego modułu raz — potem kopiuj do każdego promptu bez modyfikacji.

---

## BUDOWANIE IDENTITY_LOCK

Wypełnij każdą kategorię. Puste pole = AI wypełni losowo = błąd spójności.

```
IDENTITY_LOCK:

STRUKTURA TWARZY:
  - nos: [kształt, skrzywienie, garb — z której strony, wielkość dziurek]
  - żuchwa: [która strona cięższa, cofnięcie, mięsień żwacza]
  - kości policzkowe: [która wyżej, różnica]
  - czoło: [wypukłość, przebieg linii włosów]
  - asymetria oczu: [które niżej, o ile mm, różnica powiek]

SKÓRA (MAPA, NIE TON):
  - czoło: [odcień, tekstura]
  - policzki: [zaczerwienienie, naczynka, która strona]
  - nos: [pory, zaskórniki, odcień]
  - pod oczami: [głębokość worków, kolor — osobno lewy / prawy]
  - broda: [stan skóry, podrażnienia]

WŁOSY:
  - linia: [zakola M / receding / cofnięcie od czoła]
  - gęstość: [równomierna / przerzedzona gdzie]
  - stan: [przetłuszczone / suche / poplątane]
  - siwe pasma: [gdzie, ile]

ZAROST:
  - gęstość: [mapa — pod nosem / broda / policzki / szyja]
  - patchy: [gdzie przerwy]
  - siwizna w zaroście: [gdzie]
  - linia szyi: [równa / krzywa]
  - ślady golenia: [ile cięć, gdzie]

OCZY:
  - białka: [stan — przekrwione / żółtawe]
  - wilgotność: [lewe / prawe — osobno]
  - spojrzenie: [kontakt z obiektywem / nieobecne / w bok]
  - cienie pod oczami: [głębokość, kolor — osobno]

CIAŁO / POSTAWA:
  - ciężar ciała: [która noga bardziej obciążona]
  - barki: [który wyżej, różnica]
  - głowa: [pochylona która stronę]
  - kompensacja: [jeśli jedno jest krzywe — co kompensuje]

STAŁE REKWIZYTY (obowiązkowo):
  - zegarek: [marka, model, kolor, ręka]
  - biżuteria: [co, gdzie]
  - okulary: [jeśli są — model, kolor opraw]
  - blizny / znaki szczególne: [gdzie dokładnie]
```

---

## PRZYKŁAD WYPEŁNIONY (Obiekt "Kołobrzeg")

```
IDENTITY_LOCK:

STRUKTURA TWARZY:
  - nos: lekko skręcony w lewo, garb widoczny tylko z prawej strony profilu,
          prawa dziurka większa
  - żuchwa: lewa strona cięższa, silniejszy mięsień żwacza po lewej,
             prawa smuklejsza i lekko cofnięta
  - twarz: skręcona w prawo (od widza) o ~2°
  - asymetria oczu: lewe oko niżej o ~3mm, prawa powieka głębsza fałda

SKÓRA:
  - czoło: odcień lekko żółtawy, nierówna tekstura
  - policzki: zaczerwienienie (zimno/podrażnienie), popękane naczynka obustronnie
  - nos: rozszerzone pory, strefa T przetłuszczona
  - pod oczami: lewy worek głębszy, kolor fioletowo-ziemisty; prawy płytszy
  - broda: sucha, łuszcząca się skóra wzdłuż linii zarostu

WŁOSY:
  - linia M-shape, wyraźne zakola
  - rzadkie, przetłuszczone u nasady, poplątane
  - siwe pasma tam gdzie zarost najrzadszy

ZAROST:
  - gęsty pod nosem i na brodzie
  - przerwy ("dziury") na policzkach
  - nierówna linia szyi po lewej
  - zapalenie mieszków po lewej (w miejscu skaleczeń)
  - 3 wyraźne blizny po goleniu na szyi pod lewą żuchwą

OCZY:
  - silnie przekrwione białka, obustronnie
  - nierównomierne nawilżenie (asymetria wzmocniona)
  - spojrzenie nieobecne, skierowane poza kadrę

CIAŁO:
  - prawe ramię niżej
  - deformacja prawej kieszeni (smartfon)
```

---

## REGUŁA KOŃCOWA

> Identity Lock to nie "opis człowieka".
> To mapa biologiczna, która musi być identyczna w każdym ujęciu serii.
> Jeśli cokolwiek się zmienia między kadrami bez powodu fabularnego — to nie jest człowiek, to render.
