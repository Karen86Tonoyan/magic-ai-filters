# GAMMA Knowledge Pack

This directory contains the imported `GAMMA_Pack_v6_2.zip` source materials as a canonical knowledge pack inside the main ALFA repository.

## What It Is

GAMMA here is treated as:
- reference methodology,
- prompt and workflow knowledge,
- ComfyUI-related support material,
- future RAG source material.

It is **not** currently treated as production runtime code for ALFA-CORE.

## Provenance

- Source archive: `C:\Users\PC\Downloads\GAMMA_Pack_v6_2.zip`
- Imported into repo: `2026-04-21`
- Archive internal root: `GAMMA_Pack_v1`
- Internal README version note: `Production Pack v1 / GAMMA REALISM V5`

Note: the outer filename (`v6_2`) and inner pack naming (`v1`) are inconsistent, so this import preserves the original source tree and records the mismatch instead of guessing a new canonical version.

## Structure

- `source/GAMMA_Pack_v1/01_CORE/` - identity lock, validator, defects, master pipeline
- `source/GAMMA_Pack_v1/02_SCENE/` - scene engine, prompt templates, light models
- `source/GAMMA_Pack_v1/03_CAMERA/` - camera and film realism references
- `source/GAMMA_Pack_v1/04_COMFYUI/` - node source, workflow JSON, ComfyUI notes
- `source/GAMMA_Pack_v1/05_VISUAL_POST/` - black/gold system, retouching, design system
- `source/GAMMA_Pack_v1/06_VIDEO_YT/` - video dynamics and typo engine notes
- `source/GAMMA_Pack_v1/07_COMMERCIAL/` - commercial and product integration notes
- `source/GAMMA_Pack_v1/08_TOOLS/` - reserved/empty
- `index.json` - machine-readable manifest for future ingestion

## Recommended Use Now

- Use this pack as reference when discussing GAMMA workflows, realism rules, scene construction, or ComfyUI support material.
- Use `01_CORE/master_pipeline_v2.md` and `01_CORE/identity_lock.md` as primary anchor documents.
- Treat `04_COMFYUI/gamma_scene_engine.py` as review-required source, not auto-trusted production code.

## Later RAG Ingestion

This pack is already staged in a way that supports future ingestion:
- preserved source hierarchy,
- clear topical grouping,
- machine-readable manifest,
- no mixing with runtime ALFA-CORE packages.