# MASTER_PIPELINE_V2 — instrukcja wykonawcza dla modelu (hardened)

Zasada nadrzędna: NIE GENERUJESZ OBRAZÓW. KONSTRUUJESZ FRAGMENTY FIZYCZNEJ RZECZYWISTOŚCI.

```
YOU ARE NOT GENERATING IMAGES.
YOU ARE CONSTRUCTING PHYSICAL REALITY FRAGMENTS.

If it looks "nice"        → FAIL
If it looks "clean"       → FAIL
If it looks "intentional" → FAIL
```

---

## GLOBALNY TRYB (zawsze aktywny)

```
Every output must feel like:
- a captured moment
- not a designed image
- not an aesthetic composition
```

---

## PIPELINE — KOLEJNOŚĆ OBOWIĄZKOWA (nie do zmiany)

```
1. IDENTITY      — człowiek / obiekt (ślady fizyczne, nie opisy)
2. CONTEXT       — co się dzieje i DLACZEGO
3. PHYSICAL CONSEQUENCES — co z tego wynika biologicznie
4. DEFECTS       — łańcuchy przyczynowe, nie lista wad
5. LIGHT         — światło jako destruktor, nie dekorator
6. CAMERA        — degradacja obrazu (artefakty, szum, blur)
7. VALIDATION    — czy to nadal wygląda jak życie
```

---

## NODE 1: IDENTITY — ŚLED FIZYCZNE, NIE OPISY

```
IDENTITY IS NOT VISUAL — IT IS TRACEABLE

NIE używaj:
"same man"
"same character"

UŻYWAJ:
- same jacket (creased left pocket from cigarette pack)
- same cheap Casio F-91W watch (worn strap, scratch at 3 o'clock)
- same scar under right eyebrow (3cm, slightly raised)
- same cigarette brand (visible pack shape in pocket)
- same boot (left sole worn differently from old knee injury gait)
```

Reguła: jeśli identity nie można ZWERYFIKOWAĆ FIZYCZNIE → FAIL

---

## NODE 2: CONTEXT — DLACZEGO TEN MOMENT?

```
SCENE MUST ANSWER:
WHY WAS THIS MOMENT CAPTURED BY ACCIDENT?
```

❌ ŹLE:
"man standing in street"

✅ DOBRZE:
"he stopped because bus was late,
shifted weight to right leg,
left knee slightly bent from old injury,
phone in right pocket pressing fabric outward,
his mind is elsewhere — not here"

---

## NODE 3: PHYSICAL CONSEQUENCES

Każde zdarzenie musi mieć konsekwencje biologiczne:

```
Event:           long wait in cold
Consequence:     redness at nose tip, hands half-fisted in pockets,
                 posture closed inward, breath visible (cold air)

Event:           lit cigarette
Consequence:     smoke lingers (no wind), thumb slightly raised,
                 lighter goes back in left pocket (specific bulge)

Event:           looking at phone
Consequence:     right pocket now empty (material flat),
                 left shoulder slightly lower (head tilt to read screen)
```

---

## NODE 4: DEFECT ENGINE — ŁAŃCUCHY PRZYCZYNOWE

Nie lista wad. PROCES.

```
PRIMARY DEFECT:
broken capillaries on nose

SECONDARY EFFECT:
→ redness intensifies under cold light
→ shadow becomes asymmetric in that area
→ skin reflects differently than surrounding face

PRIMARY DEFECT:
heavy eyelid ptosis (left side, fatigue)

SECONDARY EFFECT:
→ left side of mouth slightly lower (facial tension)
→ sweat pooling in deep brow furrow
→ refracted light creates tiny caustic spot in wrinkle
```

Reguła: każda PRIMARY wada musi mieć minimum 1 SECONDARY konsekwencję.

---

## NODE 5: LIGHT — DESTRUKTOR

```
LIGHT MUST REVEAL SOMETHING UNWANTED
```

Jeśli światło "upiększa" → FAIL

Funkcja światła:
- odsłania nierówną teksturę skóry
- pogłębia zmarszczki
- sprawia że oczy wyglądają zmęczej niż są
- rzuca cień który psuje symetrię
- WB niezgodny — kolory się gryzą

```
[LIGHT DESTRUCTOR MODEL]
source:      one dying sodium lamp
position:    45° from left, harsh falloff
effect:      reveals uneven skin, dry patches on forehead,
             dust particles in wool of coat visible,
             subject looks "unwell" not "noble"
color:       warm yellow contamination in shadows
WB:          conflict with cold ambient — no correction
```

---

## NODE 6: CAMERA — DEGRADACJA OBRAZU

```
CAMERA IS NOT NEUTRAL — IT DAMAGES REALITY

Required artifacts (mix 2-3):
- motion blur (micro, hands/edges)
- missed focus (slight — focus behind eyes on nose bridge)
- noise (non-uniform — heavier in shadows)
- color shift (purple fringe on gold ring, green in deep shadows)
- compression (JPEG-like banding in flat areas)
- lens distortion (slight barrel, especially 24mm and wider)
- handheld jitter (0.5-1.5° random)
- chromatic aberration (edges of high-contrast areas)
```

---

## NODE 7: BINARY VALIDATOR (rozszerzony)

```
TEST 1: Would a random person DELETE this photo?
        YES = PASS (ugly, badly framed, bad light)

TEST 2: Does anything look "perfect"?
        YES = FAIL

TEST 3: Does it feel staged?
        YES = FAIL

TEST 4: Can you SMELL the place?
        NO = FAIL (cold wet concrete, old cigarette smoke, oil)

TEST 5: Can identity be physically verified?
        NO = FAIL (check jacket, watch, scar)

TEST 6: Does every defect have a causal chain?
        NO = FAIL (isolated wads = AI list, not reality)
```

---

## RANDOM IMPERFECTION LAYER (OBOWIĄZKOWY)

To jest to czego brakowało — "przypadkowe elementy":

```
ACCIDENTAL ELEMENTS (losuj 1-2 per scene):
- someone passing behind (partial blur at frame edge)
- object partially cut by frame
- wrong framing (head slightly cut at top)
- unexpected shadow from off-frame source
- lens smear from moisture/touch
- timestamp artifact (if cheap camera)
- dust on sensor (visible in sky/flat area)
```

---

## GOLD/BLACK MATERIAL PHYSICS (implementacja)

```
BLACK:
- absorbs detail (not #000000 — it's absence of photons in dust)
- kills background information progressively
- creates uncertainty (what's there?)
- must have sensor noise in deep shadow areas

GOLD:
- appears ONLY where light hits imperfect surface
- never clean, always slightly dirty / worn
- micro-reflections, not shine
- fingerprint residue dulls the surface unevenly
- scratches create directional reflections
- "used luxury" not "new luxury"
```

---

## FINALNA INSTRUKCJA WYKONAWCZA

```
Construct a fragment of physical reality, not an image.

Maintain strict identity continuity through PHYSICAL TRACES ONLY
(clothing deformation, objects, scars — not descriptions).

Generate defects with CAUSAL CONSEQUENCES, not isolated features.

Scene must represent a moment that HAPPENED, not a pose.

Light must EXPOSE imperfections, not beautify.

Camera must DEGRADE reality (noise, blur, distortion, color shift).

Introduce accidental imperfection
(framing errors, background interference, asymmetry).

REJECT ALL AESTHETIC INTENT.

If output looks designed, cinematic, clean, or perfect → REGENERATE.

NEGATIVE (global):
no beauty, no symmetry, no perfect skin, no cinematic lighting,
no HDR, no influencer look, no retouch, no artificial clarity,
no perfect composition, no intentional framing
```

---

## COMFYUI MODUŁY (mapowanie na node flow)

```
NODE 1 IDENTITY    → IPAdapter input (face reference + physical traces)
NODE 2 CONTEXT     → Positive CLIP text (scene description)
NODE 3 PHYSICAL    → Positive CLIP text (physics consequences)
NODE 4 DEFECTS     → Positive CLIP text (defect chains)
NODE 5 LIGHT       → Positive CLIP text (light destructor)
NODE 6 CAMERA      → KSampler params + post-process (grain/blur)
NODE 7 VALIDATOR   → Manual check or automated scoring node
```
