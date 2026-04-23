# GAMMA Scene Engine — Custom Node for ComfyUI
# Install: copy to ComfyUI/custom_nodes/gamma_scene_engine.py
# Restart ComfyUI — node appears under category "GAMMA"

import random
import json

SUBJECT_STATES = {
    "tired":      "blank expression, posture slightly collapsed, delayed reaction, eyes heavy, eyelid ptosis",
    "irritated":  "jaw tension, one brow slightly raised, closed posture, mouth corners down",
    "blank":      "expression absent, gaze unfocused, no emotional presence, face in default stressed state",
    "stressed":   "neck tension, shallow breathing visible, micro-movements of hands, pupils slightly dilated",
    "after_work": "body decompressing, shoulders dropping, weight shifting to one leg, coat pulling down",
}

ENVIRONMENTS = {
    "parking":    "empty parking lot, dirty wet asphalt, dark car nearby, concrete pillars, random trash, oil stains",
    "kitchen":    "messy kitchen counter, dirty dishes in sink, crumbs visible, misaligned items, cold fluorescent",
    "stairwell":  "dirty painted walls, worn stair edges, scuff marks, cold empty space, distant echo",
    "room":       "unmade bed, cables on floor, objects without logic on surfaces, window overexposed",
    "store":      "commercial fridge section, cold LED light, product labels visible, chaotic background",
    "car":        "interior from passenger perspective, dashboard visible, city blurred outside, cracked leather",
    "balcony":    "urban building view, railing with slight rust, city noise implied, grey overcast",
    "street":     "wet asphalt, random pedestrians blurred, no staging, accidental framing",
}

PHYSICS_MAP = {
    "phone":      "right pocket visibly deformed by phone weight, material stretched at seam",
    "keys":       "left pocket asymmetric bulge from keys, fabric pulled slightly downward",
    "cigarettes": "cigarette pack shape visible in breast pocket, partial crush from daily use",
    "wallet":     "back pocket distortion, slight lean compensation to right side",
    "bag":        "shoulder strap raising right shoulder 2-3cm, posture compensating with left tilt",
}

LIGHT_DESTRUCTOR = {
    "parking":    "sodium lamp from right, face half yellow, left side cold blue shadow, WB conflict",
    "kitchen":    "harsh overhead fluorescent, sharp shadows under eyes, forehead overexposed, no fill",
    "store":      "commercial LED cold light, blue/white cast, unnatural skin tone, dark eye sockets",
    "room":       "phone screen or monitor glow, green/blue tint on face, rest in deep shadow",
    "car":        "dashboard glow from below, streetlights strobing through window, no neutral WB",
    "stairwell":  "single overhead bulb, flat harsh, all shadows pointing straight down",
    "balcony":    "warm sodium from city + cold ambient sky, color conflict on face",
    "street":     "mixed: sodium lamp + cold LED + car headlights, none winning, total WB chaos",
    "default":    "mixed white balance, one side slightly overexposed, other in dirty shadow",
}

CAMERA_BASELINES = {
    "d700":       "shot on Nikon D700, 35mm f/4.8, ISO 300, 1/90s, mixed incorrect white balance, raw documentary",
    "cheap_phone":"cheap smartphone, wide angle slight distortion, compression artifacts, unstable focus, high ISO noise",
    "old_digital":"compact digital camera 2008-2012, weak dynamic range, dirty shadows, chromatic aberration",
    "leica_analog":"Leica M6, Summicron 35mm f/2, Kodak Portra 400H +1 stop, grain embedded in emulsion structure",
}

COMMERCIAL_SUFFIX = {
    "off":    "",
    "low":    "product present but not central, integrated naturally, partially obscured, inherits world conditions",
    "medium": "product visible and readable, not highlighted, not cleaner than environment, used not new",
}

ACCIDENTAL_ELEMENTS = [
    "someone partially enters frame on left edge, blurred",
    "object partially cut by frame bottom, no composition intent",
    "head slightly cut at top, too much dirty ceiling",
    "unexpected shadow from off-frame source crosses face",
    "lens smear from moisture at bottom-left corner",
    "dust particle visible in flat light area (sensor dust)",
    "reflection in background glass partially overlaps subject",
]

NEGATIVE_GLOBAL = (
    "beauty lighting, perfect skin, symmetry correction, plastic skin, CGI look, "
    "cinematic grading, HDR, glow, retouching, denoise, over-sharpening, "
    "fashion photography, influencer aesthetic, studio portrait, clean background, "
    "minimalism, centered framing, professional composition, model face, "
    "smooth motion, perfect lighting, artificial clarity"
)

INTENT_PHRASES = [
    "photo taken accidentally, no composition intent, moment captured not constructed",
    "slightly tilted frame, no direct eye contact, image made without importance",
    "accidental frame, someone already had phone in hand, this was not the shot",
    "shot like it didn't matter, no second take, never reviewed",
    "surveillance angle, operator not looking, pure documentation",
]


class GammaSceneEngine:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "character_anchor": ("STRING", {
                    "multiline": True,
                    "default": "same male subject, asymmetrical face, tired eyes, uneven beard, M-shaped hairline",
                }),
                "mood": (["tired", "irritated", "blank", "stressed", "after_work"],),
                "location_type": (["parking", "kitchen", "stairwell", "room", "store", "car", "balcony", "street"],),
                "time_state": (["morning", "end_of_day", "night", "rush", "after_work"],),
                "object_1": (["phone", "keys", "cigarettes", "wallet", "bag"],),
                "object_2": (["none", "phone", "keys", "cigarettes", "wallet"],),
                "camera_style": (["d700", "cheap_phone", "old_digital", "leica_analog"],),
                "commercial_mode": (["off", "low", "medium"],),
                "product_name": ("STRING", {"multiline": False, "default": ""}),
                "enable_accidental": ("BOOLEAN", {"default": True}),
                "seed_scene": ("INT", {"default": 0, "min": 0, "max": 999999999}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "STRING")
    RETURN_NAMES = ("scene_prompt", "negative_prompt", "scene_json")
    FUNCTION = "build_scene"
    CATEGORY = "GAMMA"

    def build_scene(self, character_anchor, mood, location_type, time_state,
                    object_1, object_2, camera_style, commercial_mode,
                    product_name, enable_accidental, seed_scene):

        rng = random.Random(seed_scene)

        state   = SUBJECT_STATES.get(mood, SUBJECT_STATES["blank"])
        env     = ENVIRONMENTS.get(location_type, "imperfect urban space, non-aesthetic, used")
        phys1   = PHYSICS_MAP.get(object_1, "")
        phys2   = PHYSICS_MAP.get(object_2, "") if object_2 != "none" else ""
        physics = ", ".join(filter(None, [phys1, phys2]))
        physics += ", shoulders uneven, weight on one leg, posture asymmetric"
        light   = LIGHT_DESTRUCTOR.get(location_type, LIGHT_DESTRUCTOR["default"])
        camera  = CAMERA_BASELINES.get(camera_style, CAMERA_BASELINES["d700"])
        intent  = rng.choice(INTENT_PHRASES)
        accidental = rng.choice(ACCIDENTAL_ELEMENTS) if enable_accidental else ""

        commercial = COMMERCIAL_SUFFIX.get(commercial_mode, "")
        if commercial_mode != "off" and product_name:
            commercial = f"{product_name}: {commercial}"

        parts = [
            "fragment of a day, not a posed photo,",
            character_anchor,
            state,
            env,
            physics,
            light,
            intent,
        ]
        if accidental:
            parts.append(accidental)
        parts.append(camera)
        if commercial:
            parts.append(commercial)

        scene_prompt    = "\n".join(p for p in parts if p.strip())
        negative_prompt = NEGATIVE_GLOBAL
        scene_json      = json.dumps({
            "mood": mood, "location": location_type, "time": time_state,
            "objects": [object_1, object_2], "camera": camera_style,
            "commercial": commercial_mode, "product": product_name,
            "accidental_enabled": enable_accidental, "seed": seed_scene,
        }, ensure_ascii=False, indent=2)

        return (scene_prompt, negative_prompt, scene_json)


NODE_CLASS_MAPPINGS     = {"GammaSceneEngine": GammaSceneEngine}
NODE_DISPLAY_NAME_MAPPINGS = {"GammaSceneEngine": "GAMMA Scene Engine v2"}
