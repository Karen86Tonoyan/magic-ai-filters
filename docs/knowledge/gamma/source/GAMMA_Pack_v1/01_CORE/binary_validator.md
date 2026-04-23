# BINARY_VALIDATOR — test prawdziwości outputu

Zasada: JEDEN błąd = FAIL. Zero tolerancji.
Użyj tego modułu PRZED wklejeniem promptu do modelu.

---

## TEST (TAK / NIE)

### CIĄGŁOŚĆ POSTACI
- [ ] Ten sam zegarek / biżuteria w każdym ujęciu serii?
- [ ] Te same wady strukturalne (nos, asymetria)?
- [ ] Ten sam zakres marek i stylu ubrania?

NIE = FAIL

---

### KIESZENIE / FIZYKA
- [ ] Widać gdzie jest telefon?
- [ ] Klucze / portfel deformują materiał?
- [ ] Jeśli pali — paczka i zapalniczka mają ślad fizyczny?
- [ ] Jeśli coś trzyma w ręce — kieszeń jest pusta (materiał płaski)?

NIE = FAIL

---

### TWARZ (BIOLOGIA)
- [ ] Asymetria strukturalna (nie "ładna")?
- [ ] Pory / zaskórniki / mikrozacięcia?
- [ ] Niejednorodny kolor skóry (mapa, nie ton)?
- [ ] Oczy niesynchronizowane (wilgoć, ostrość, kontakt)?

NIE = FAIL

---

### STAN / CZAS
- [ ] Brak jednej czytelnej "ładnej" emocji?
- [ ] Twarz "w trakcie", nie w kulminacji?
- [ ] Stan biologiczny widoczny (zmęczenie / zimno / stres)?

NIE = FAIL

---

### CIAŁO / POZA
- [ ] Poza byłaby niewygodna po 2-3 minutach?
- [ ] Jedna strona ciała bardziej obciążona?
- [ ] Ręce to "problem", nie element kompozycji?

NIE = FAIL

---

### ŚWIATŁO
- [ ] Światło atakuje twarz, nie służy jej?
- [ ] Jedna strona spalona, druga w brudnym cieniu?
- [ ] WB błędny lub mieszany?

NIE = FAIL

---

### KADR
- [ ] Krzywy horyzont?
- [ ] Obcięty element ciała lub nieestetyczne tło?
- [ ] Brak centralnej intencji kompozycyjnej?

NIE = FAIL

---

### INTENCJA
- [ ] Zdjęcie mogło nie powstać i nic by się nie stało?

NIE = FAIL

---

### TEST OSTATECZNY (ODWRÓCONY)
- Czy da się to estetycznie obronić?

TAK = FAIL (AI)
NIE = PASS (człowiek)

---

## WYNIK

```
WSZYSTKO TAK (oprócz testu ostatecznego który = NIE) → PASS — ŻYCIE
1 błąd → FAIL — SYNTHETIC
```

---

## CO ZROBIĆ PO FAIL

Zidentyfikuj które pytanie = NIE.
Wróć do odpowiedniego modułu:

| Problem | Moduł do poprawki |
|---------|-------------------|
| Ciągłość postaci | identity_lock.md |
| Kieszenie / fizyka | defect_engine.md (warstwa 8) |
| Twarz / defekty | defect_engine.md |
| Stan / czas | scene_engine.md |
| Światło | scene_engine.md (LIGHT_MODEL) |
| Kadr | scene_engine.md (FRAME_ERROR) |
| Estetyka / AI-look | prompt_template.md (NEGATIVE) |

Popraw konkretny element. Nie przepisuj całości.
