# GAMMA REALISM SYSTEM — Production Pack v1
**Karen Tonoyan / ALFA**
Kontakt: kontakt@karentonoyan.pl

---

## CO JEST W PACZCE

```
01_CORE/               — Rdzeniowy system (pipeline, identity, defekty, walidacja)
02_SCENE/              — Silnik scen (szablony, 20 gotowych scen, prompt templates)
03_CAMERA/             — Sprzęt, analog/film system, naprawa artefaktów AI
04_COMFYUI/            — Gotowy node .py + JSON workflow do importu
05_VISUAL_POST/        — Photoshop workflow, Gold/Black system, archetypy, design tokens
06_VIDEO_YT/           — Video dynamics, 10 shortów serial, typo engine, hooki
07_COMMERCIAL/         — Reklama jako życie: product integration, AD validator
08_TOOLS/              — (puste — miejsce na Twoje rozszerzenia)
```

---

## SZYBKI START (5 minut)

### 1. Dla Claude (system prompt / project knowledge)
Wklej zawartość `01_CORE/master_pipeline_v2.md` jako instrukcję systemową.
Dodaj `01_CORE/identity_lock.md` jako kontekst postaci.
To wystarczy do natychmiastowej pracy.

### 2. Dla ComfyUI
```bash
cp 04_COMFYUI/gamma_scene_engine.py ComfyUI/custom_nodes/
# restart ComfyUI
# node pojawi się w kategorii "GAMMA"
```
Zaimportuj `04_COMFYUI/workflow_guardian_base.json` przez Load Workflow.

### 3. Dla Midjourney / Flux
Użyj szablonów z `02_SCENE/prompt_template.md`.
Wklej bezpośrednio — gotowe do użycia.

### 4. Dla Photoshop
Workflow krok po kroku w `05_VISUAL_POST/photoshop_retusz.md`.
Zasada: kontrolujesz KTÓRE wady zostają — nie usuwasz wszystkich.

### 5. Dla YouTube / Shorts
Gotowe skrypty 10 shortów w `06_VIDEO_YT/video_dynamics.md`.
Power words + animacje w `06_VIDEO_YT/typo_engine.md`.

---

## ZASADA GŁÓWNA SYSTEMU

```
NIE GENERUJESZ OBRAZÓW.
KONSTRUUJESZ FRAGMENTY FIZYCZNEJ RZECZYWISTOŚCI.

Jeśli wygląda "ładnie"       → FAIL
Jeśli wygląda "czysto"       → FAIL
Jeśli wygląda "celowo"       → FAIL
```

---

## PIPELINE (kolejność obowiązkowa)

```
1. IDENTITY      → ślady fizyczne (blizna, zegarek, zagniecenie kieszeni)
2. CONTEXT       → dlaczego ten moment powstał przypadkiem
3. CONSEQUENCES  → co z tego wynika biologicznie (ciężar, zmęczenie)
4. DEFECTS       → łańcuchy przyczynowe (nie lista wad)
5. LIGHT         → destruktor (eksponuje wady, nie upiększa)
6. CAMERA        → degradacja (szum, blur, aberracja, WB błędny)
7. VALIDATION    → Test 4: "Czy czujesz zapach miejsca?" — NIE = FAIL
```

---

## KLUCZOWE PARAMETRY COMFYUI

```
CFG:     5.0      ← powyżej 7 = AI look
Steps:   28       ← więcej = gładszy = AI look
Sampler: DPM++ 2M Karras
Denoise: 0.8-0.85
Face Detailer: 0.3 (lekko) lub wyłącz całkowicie
```

---

## IDENTITY LOCK — GUARDIAN (przykład do wielokrotnego użycia)

```
same male subject, 40-45,
cheap black wool coat (left pocket stretched from cigarette pack),
Casio F-91W watch (scratched crystal, worn strap),
small scar under right eyebrow,
slightly crooked nose (leans left),
right eyelid heavier (mild ptosis),
posture: weight on right leg, left shoulder lower
```

---

## ZŁOTA ZASADA TEKSTU (Black & Gold)

```
Styl to nie to co dodajesz.
Styl to to co konsekwentnie odrzucasz.

NIE: "I am designer. Creative solutions."
TAK: "I don't design luxury. I expose it."
```

---

## WERSJA

- System: GAMMA REALISM V5
- Pack: v1.0
- Moduły: 19
- Data: 2026-04
