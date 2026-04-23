# COMFYUI_10_WORKFLOWS — 10 gotowych workflowów produkcyjnych

Master instrukcja dla buildera workflows.
Każdy workflow = inny tryb rzeczywistości, inny failure mode.

---

## GLOBAL RULES (wszystkie workflows)

```
- NO beauty, NO cinematic, NO perfection
- ALWAYS: imperfection + physics + randomness
- ALWAYS: asymmetry + bad/mixed lighting + grain/texture
- CFG: 4-6 (wyższe = AI look)
- GOAL: "this was not designed, it just happened"
```

---

## WORKFLOW 01 — RAW STREET MOMENT

**Purpose:** Dokumentalny moment uliczny — człowiek w ruchu, bez intencji zdjęcia.

**Prompt:**
```
fragment of a day, not a posed photo,
male subject, 35-45, asymmetrical face, tired eyes, uneven beard,
walking on wet asphalt, weight shifted to one leg mid-step,
hands in jacket pockets, fabric slightly pulled,
street lamp creating hard yellow shadow under cheekbones,
background: pedestrians blurred, random urban objects,
shot tilted 3°, subject not centered, motion blur on hands,
cheap digital camera, ISO noise, chromatic aberration at edges,
raw documentary, no intention
```

**Negative:** beauty lighting, perfect skin, symmetry, studio portrait, sharp edges, fashion pose, clean background

**Node Flow:**
```
CheckpointLoader (SDXL / Flux)
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.65, face reference)
→ ControlNet OpenPose (strength: 0.5)
→ KSampler (CFG: 5, steps: 28, DPM++ 2M Karras, denoise: 0.85)
→ Face Detailer (denoise: 0.35 — minimal)
→ Noise layer (+15%)
→ Save Image
```

**Unique parameter:** Motion blur node on hands only (selective blur mask)

---

## WORKFLOW 02 — COMMERCIAL BROKEN REALISM

**Purpose:** Produkt w scenie — wygląda jak życie, nie reklama.

**Prompt:**
```
fragment of a day, product exists not as hero,
male subject waiting near car, not posing,
watch visible only during hand movement, partially in shadow,
watch strap worn, reflection of car roof broken on watch face,
jacket deformed by phone in right pocket,
light bouncing off hood — one side overexposed, left in dirty shadow,
WB conflict: cold outdoor vs warm sodium lamp,
frame slightly cut — car roof missing,
shot on Nikon D700, ISO 300, 1/90s, mixed WB
```

**Negative:** product hero shot, clean reflections, centered watch, beauty lighting, studio, perfect skin, jewelry look

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive: scene + product integration)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.7)
→ ControlNet Depth (strength: 0.45)
→ KSampler (CFG: 4.5, steps: 30, DPM++ 2M Karras)
→ Face Detailer (denoise: 0.3)
→ Color shift node (slight green in shadows)
→ Save Image
```

**Unique parameter:** Color shift node — green contamination in shadow areas only

---

## WORKFLOW 03 — STUDIO IMPERFECT

**Purpose:** Studio ale złamane — oświetlenie kontrolowane, ale biologicznie brutalne.

**Prompt:**
```
studio environment but no perfection,
male, deep-set eyes, uneven beard density, M-shaped hairline,
seated on stool, leaning forward, elbows on knees,
one shoulder higher from bag strap tension,
key light: Profoto Octabox 90cm, camera-left, slightly too close,
overexposing left cheekbone, grain visible in skin texture,
rim light: warm CTO gel on right side, partial hair outline,
background: black velvet but slightly lit by spill, texture visible,
face detailer disabled — imperfections preserved,
Nikon D700, 50mm, ISO 400, skin texture embedded grain
```

**Negative:** perfect studio, beauty dish, smooth skin, symmetric lighting, retouching, HDR, catalog look

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.75 — more face-locked for studio)
→ ControlNet (none — studio, no need)
→ KSampler (CFG: 5.5, steps: 32, Euler a, denoise: 0.9)
→ Face Detailer DISABLED
→ Texture boost node (+20%)
→ Save Image
```

**Unique parameter:** Face Detailer OFF — imperfections must survive. Texture boost applied instead.

---

## WORKFLOW 04 — NIGHT LIGHT MIX

**Purpose:** Nocna scena miejska — konflikt źródeł światła, zero kontroli.

**Prompt:**
```
night urban scene, no controlled lighting,
male subject near bus stop, waiting too long,
face: left side sodium lamp yellow, right side cold LED white,
WB completely wrong — colors conflict on face,
cigarette pack visible in jacket pocket,
asphalt reflection showing distorted color,
background: blurred cars, neon signs out of focus,
grain: heavy, ISO 6400 equivalent,
eyes half-closed from fatigue, not looking at camera,
frame tilted, shot from wrong angle
```

**Negative:** clean night portrait, neon aesthetic, beautiful bokeh, cinematic city, symmetry, model face, intentional composition

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.6 — looser in night)
→ ControlNet OpenPose (strength: 0.4)
→ KSampler (CFG: 4, steps: 25, DPM++ 2M Karras)
→ Heavy Grain node (+25%)
→ Color temperature conflict node
→ Save Image
```

**Unique parameter:** Dual color temperature node — warm left / cold right split on face

---

## WORKFLOW 05 — CAR INTERIOR

**Purpose:** Wnętrze auta — poczucie dnia, nie sesji zdjęciowej.

**Prompt:**
```
car interior, passenger side perspective,
driver: male, mid-40s, heavy posture, both hands on wheel,
eyes on road, not aware of camera,
window reflection overlapping face — city blurred outside,
dashboard light green-tinted in shadow areas,
one hand slightly blurred from micro-movement,
cracked leather seat visible, imperfect environment,
windshield slightly dirty — adds diffusion layer,
cheap digital camera from passenger seat, unstable,
hand-held feel, no tripod stability
```

**Negative:** hero portrait, clean car, glamour, fashion, cinematic car shot, perfect lighting, directed look

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.55 — reflections reduce face clarity)
→ ControlNet Depth (strength: 0.5 — interior depth)
→ KSampler (CFG: 4.5, steps: 27, DPM++ 2M Karras)
→ Motion blur node (hands only, 2px)
→ Diffusion layer (windshield effect)
→ Save Image
```

**Unique parameter:** Diffusion mask mimicking dirty windshield — selective blur over subject

---

## WORKFLOW 06 — HOME CHAOS

**Purpose:** Dom — prywatność, zmęczenie, bałagan, zero stagingu.

**Prompt:**
```
private home environment, no staging,
male subject sitting on edge of unmade bed,
elbows on knees, hands clasped, looking at floor,
clothing: same as yesterday — wrinkled t-shirt, pilling visible,
phone on bed nearby, cable coiled,
window: morning light overexposed, white blowout,
opposite wall: warm lamp casting yellow on right shoulder,
grain embedded in image, visible in shadows,
posture: decompressed, not collapsed — just heavy,
shot from doorway — partial door obstruction in frame corner
```

**Negative:** clean bedroom, lifestyle, morning routine, influencer, symmetry, pleasant mood, studio light

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.7)
→ ControlNet (none)
→ KSampler (CFG: 5, steps: 30, DPM++ 2M Karras)
→ Face Detailer (denoise: 0.3)
→ Window blowout mask (overexpose one side)
→ Save Image
```

**Unique parameter:** Window overexposure mask — hard cut between blown window and interior shadow

---

## WORKFLOW 07 — LAB / TECH ENVIRONMENT

**Purpose:** Środowisko techniczne — człowiek przy sprzęcie, nie w centrum.

**Prompt:**
```
tech/lab environment, documentary capture,
male subject looking at monitor, not at camera,
screen reflection on glasses — content illegible but present,
cables not aligned, papers off-center on desk,
monitor: cold blue-green cast dominating face,
warm desk lamp from left — WB conflict,
chair slightly rotated from center line,
one shoulder raised — concentration posture,
environment: real workspace, not staged,
shot on Nikon D700, 35mm, ISO 300, 1/90s
```

**Negative:** clean desk, professional setup, hero shot, symmetry, beautiful workspace, product placement, direct eye contact

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.65)
→ ControlNet Depth (strength: 0.4 — scene depth)
→ KSampler (CFG: 5, steps: 28, DPM++ 2M Karras)
→ Screen glow color node (cold blue face tint)
→ Face Detailer (denoise: 0.4)
→ Save Image
```

**Unique parameter:** Screen glow node — cold blue cast mapped only to face/glasses area

---

## WORKFLOW 08 — ANALOG PORTRAIT

**Purpose:** Analogowy portret — film embedded, nie overlay. Pory + ziarno = ten sam materiał.

**Prompt:**
```
analog film portrait, grain embedded in emulsion structure,
grain physically merging with skin pores and shaving scars,
Kodak Portra 400H overexposed +1, push processed +1, ISO 800 eq,
male subject, M-shaped hairline, uneven beard, asymmetrical jaw,
light: harsh 45° from left, falloff strong,
left cheekbone blown but grain retained in blown area,
shadows: right side crushed, green/violet contamination from push,
WB conflict: cold outdoor + warm sodium, no correction,
micro-flaking on eyebrows, broken capillaries on cheeks,
no scan correction, minor dust at frame edge,
Leica M6 mechanics, Summicron-M 35mm f/2 ASPH rendering
```

**Negative:** digital sharpness, smooth skin, perfect exposure, symmetry, beauty, clean scan, noise reduction, HDR

**Node Flow:**
```
CheckpointLoader (model with film training preferred)
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.7)
→ ControlNet (none — analog feel, loose)
→ KSampler (CFG: 4.5, steps: 25, DPM++ 2M Karras, denoise: 0.8)
→ Film grain embedded node (not overlay — structure level)
→ Chemical contamination color node
→ Save Image
```

**Unique parameter:** Film grain applied at structure level (not post-process layer). Chemical contamination: green-violet in deep shadows.

---

## WORKFLOW 09 — PRODUCT IN LIFE

**Purpose:** Produkt jako część życia — nie hero, nie reklama. Visibility: LOW.

**Prompt:**
```
product exists in scene, not as focus,
male subject in kitchen, morning, not fully awake,
coffee mug in hand — brand partially turned away from camera,
grip: casual, not demonstrating product,
mug slightly dirty at rim from previous use,
morning light: harsh overhead fluorescent, uneven,
other hand: in pocket, t-shirt wrinkled,
background: messy counter, crumbs, misaligned items,
subject not aware of camera,
shot from doorway, slightly obstructed
```

**Negative:** product hero, brand facing camera, clean hands, good lighting, lifestyle, influencer morning routine, symmetry

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.6)
→ ControlNet OpenPose (strength: 0.45)
→ KSampler (CFG: 4, steps: 26, DPM++ 2M Karras)
→ Face Detailer (denoise: 0.3)
→ Save Image
```

**Unique parameter:** CFG: 4 — lowest setting for maximum natural feel. Product integration validated by AD validator.

---

## WORKFLOW 10 — SURVEILLANCE FEEL

**Purpose:** Poczucie CCTV / found footage — maksymalna przypadkowość.

**Prompt:**
```
surveillance camera aesthetic, found footage feel,
male subject passing through frame, not centered,
heavy digital compression artifacts, color banding in shadows,
frame rate feel: slight ghosting on movement,
background: concrete stairwell, security light overhead,
subject: not aware of any camera, natural movement,
posture: unguarded, phone in hand, looking down,
no composition, no framing, no intention,
angle: high and off — security camera position,
cheap CCTV camera, aggressive compression, low dynamic range
```

**Negative:** composed shot, artistic framing, portrait, eye contact, beauty, cinematic, intentional photography, clean image

**Node Flow:**
```
CheckpointLoader
→ CLIP Text Encode (positive)
→ CLIP Text Encode (negative)
→ IPAdapter (weight: 0.5 — loose, surveillance feel)
→ ControlNet (none — uncontrolled)
→ KSampler (CFG: 4, steps: 22, Euler a, denoise: 0.75)
→ Compression artifact node (JPEG-like degradation)
→ Color banding node (shadows only)
→ Save Image
```

**Unique parameter:** Compression artifact simulation. High-angle camera position. Lowest IPAdapter weight = loosest identity = maximum accidental feel.

---

## GAMMA_POST_INSTRUCTION (dodaj do każdego workflow przed Save)

```
Apply 35mm film grain.
Introduce slight chromatic aberration on edges.
Crush blacks but leave digital noise in 5% luminance range.
Desaturate midtones by 15%.
Sharpen only defects (scars, pores, sweat).
Avoid all upscale artifacts that smooth image.
```
