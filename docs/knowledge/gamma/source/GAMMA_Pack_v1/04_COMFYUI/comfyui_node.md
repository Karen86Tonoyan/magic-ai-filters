# COMFYUI_NODE — GammaSceneEngine

Custom node do ComfyUI generujący prompt z 5 warstw GAMMA.
Wejście: parametry sceny. Wyjście: scene_prompt + negative_prompt + scene_struct (JSON).

---

## ARCHITEKTURA PIPELINE

```
GammaSceneEngine
 → CLIP Text Encode (positive: scene_prompt)
 → CLIP Text Encode (negative: negative_prompt)
 → IPAdapter / FaceID (identity lock, weight 0.6-0.8)
 → ControlNet OpenPose (strength 0.4-0.7)
 → ControlNet Depth (strength 0.4-0.6)
 → KSampler (CFG 4-6, steps 25-35, DPM++ 2M Karras)
 → Face Detailer (denoise 0.3-0.5 — LEKKO)
 → Noise + Color shift node
 → Save Image
```

---

## GOTOWY KOD PYTHON (wklej do ComfyUI/custom_nodes/)

```python
# gamma_scene_engine.py
# Custom node dla ComfyUI — GAMMA Realism System
# Umieść w: ComfyUI/custom_nodes/gamma_scene_engine.py

import random
import json

# ---- MAPY SCEN ----

SUBJECT_STATES = {
    "tired":     "blank expression, posture slightly collapsed, delayed reaction, eyes heavy",
    "irritated": "jaw tension, one brow slightly raised, closed posture, mouth corners down",
    "blank":     "expression absent, gaze unfocused, no emotional presence",
    "stressed":  "neck tension, shallow breathing visible, micro-movements of hands",
    "after_work":"body decompressing, shoulders dropping, weight shifting to one leg"
}

ENVIRONMENTS = {
    "parking":   "empty parking lot, dirty wet asphalt, dark car nearby, concrete pillars, random trash",
    "kitchen":   "messy kitchen counter, dirty dishes in sink, crumbs visible, misaligned items",
    "stairwell": "dirty painted walls, worn stair edges, scuff marks on surface, cold empty space",
    "room":      "unmade bed, cables on floor, objects without logic on surfaces",
    "store":     "commercial fridge section, product labels visible, chaotic background, bright cold light",
    "car":       "interior from passenger perspective, dashboard visible, city blurred outside window",
    "balcony":   "urban building view, railing with slight rust, city noise implied"
}

PHYSICS_MAP = {
    "phone":      "right pocket visibly deformed by phone weight, material stretched at seam",
    "keys":       "left pocket asymmetric bulge from keys, fabric pulled",
    "cigarettes": "cigarette pack shape visible in breast pocket, partial crush",
    "wallet":     "back pocket distortion, slight lean compensation",
    "bag":        "shoulder strap raising right shoulder 2-3cm, posture compensating left"
}

LIGHT_MAP = {
    "parking + night":     "sodium street lamp from right, face half yellow, other half dark blue shadow",
    "kitchen + morning":   "harsh overhead fluorescent, sharp shadows under eyes and nose, no fill",
    "store + any":         "commercial LED cold light, blue/white cast, unnatural skin tone",
    "room + night":        "phone screen or monitor, green/blue tint on face, rest in shadow",
    "car + any":           "dashboard glow from below, streetlights strobing through window",
    "stairwell + any":     "single overhead bulb, flat harsh, all shadows pointing down",
    "balcony + evening":   "warm sodium from city + cold ambient sky, color conflict on face",
    "default":             "mixed white balance, one side slightly overexposed, other in dirty shadow"
}

CAMERA_MAP = {
    "d700":       "shot on Nikon D700, 24-50mm f/4.8, ISO 300, 1/90s, mixed incorrect white balance, raw documentary",
    "cheap_phone":"cheap smartphone, wide angle slight distortion, compression artifacts, unstable focus, high ISO noise",
    "old_digital":"compact digital camera 2008-2012, weak dynamic range, dirty shadows, chromatic aberration, flash harshness"
}

COMMERCIAL_MAP = {
    "off":   "",
    "low":   "product present but not central, integrated naturally, partially obscured, part of real life",
    "medium":"product visible and readable, but not highlighted, not cleaner than environment, inherits world conditions"
}

NEGATIVE_BASE = (
    "beauty lighting, perfect skin, symmetry correction, plastic skin, CGI look, "
    "cinematic grading, HDR, glow, retouching, denoise, over-sharpening, "
    "fashion photography, influencer aesthetic, studio portrait, clean background, "
    "minimalism, centered framing, professional composition, model face"
)

INTENT_PHRASES = [
    "photo taken accidentally, no composition intent",
    "slightly tilted frame, no direct eye contact",
    "image made without importance, captured mid-moment",
    "accidental frame, someone already had phone in hand",
    "shot like it didn't matter, no second take"
]

# ---- NODE ----

class GammaSceneEngine:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "character_anchor": ("STRING", {
                    "multiline": True,
                    "default": "same male subject, asymmetrical face, tired eyes, uneven beard"
                }),
                "mood": (["tired", "irritated", "blank", "stressed", "after_work"],),
                "location_type": (["parking", "kitchen", "stairwell", "room", "store", "car", "balcony"],),
                "time_state": (["morning", "end_of_day", "night", "rush", "after_work"],),
                "object_1": (["phone", "keys", "cigarettes", "wallet", "bag"],),
                "object_2": (["none", "phone", "keys", "cigarettes", "wallet"],),
                "camera_style": (["d700", "cheap_phone", "old_digital"],),
                "commercial_mode": (["off", "low", "medium"],),
                "product_name": ("STRING", {"multiline": False, "default": ""}),
                "seed_scene": ("INT", {"default": 0, "min": 0, "max": 999999999}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("scene_prompt", "negative_prompt", "scene_struct")
    FUNCTION = "build_scene"
    CATEGORY = "GAMMA"

    def build_scene(self, character_anchor, mood, location_type, time_state,
                    object_1, object_2, camera_style, commercial_mode,
                    product_name, seed_scene):

        rng = random.Random(seed_scene)

        # 1. Subject state
        state = SUBJECT_STATES.get(mood, SUBJECT_STATES["blank"])

        # 2. Environment
        env = ENVIRONMENTS.get(location_type, "imperfect urban space")

        # 3. Physics
        phys_1 = PHYSICS_MAP.get(object_1, "")
        phys_2 = PHYSICS_MAP.get(object_2, "") if object_2 != "none" else ""
        physics = ", ".join(filter(None, [phys_1, phys_2]))
        physics += ", shoulders uneven, weight on one leg"

        # 4. Light
        light_key = f"{location_type} + {time_state}"
        light = LIGHT_MAP.get(light_key, LIGHT_MAP["default"])

        # 5. Camera
        camera = CAMERA_MAP.get(camera_style, CAMERA_MAP["d700"])

        # 6. Commercial
        commercial = COMMERCIAL_MAP.get(commercial_mode, "")
        if commercial_mode != "off" and product_name:
            commercial = f"{product_name}: {commercial}"

        # 7. Intent
        intent = rng.choice(INTENT_PHRASES)

        # 8. Build prompt
        parts = [
            "fragment of a day, not a posed photo,",
            character_anchor,
            state,
            env,
            physics,
            light,
            intent,
            camera,
        ]
        if commercial:
            parts.append(commercial)

        scene_prompt = "\n".join(p for p in parts if p.strip())

        # 9. Negative
        negative_prompt = NEGATIVE_BASE

        # 10. Scene struct (JSON)
        scene_struct = json.dumps({
            "mood": mood,
            "location": location_type,
            "time": time_state,
            "objects": [object_1, object_2],
            "camera": camera_style,
            "commercial": commercial_mode,
            "product": product_name,
            "seed": seed_scene
        }, ensure_ascii=False, indent=2)

        return (scene_prompt, negative_prompt, scene_struct)


NODE_CLASS_MAPPINGS = {
    "GammaSceneEngine": GammaSceneEngine
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "GammaSceneEngine": "GAMMA Scene Engine"
}
```

---

## INSTALACJA

```bash
# Skopiuj do ComfyUI:
cp gamma_scene_engine.py ComfyUI/custom_nodes/

# Restart ComfyUI — node pojawi się w kategorii GAMMA
```

---

## PARAMETRY KSAMPLER (optymalne)

```
Steps:   25-35
CFG:     4-6      ← kluczowe, wyższe = AI look
Sampler: DPM++ 2M Karras
Denoise: 0.8-1.0
```

---

## SERIAL MODE (10+ ujęć)

```
Ten sam seed bazowy dla character_anchor
Zmieniaj: location_type, time_state, seed_scene
NIE zmieniaj: character_anchor, camera_style
```
