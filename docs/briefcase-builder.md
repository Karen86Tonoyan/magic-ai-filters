# Briefcase Builder Salvage

This module salvages the useful `App Builder / Briefcase` backend concepts from the archived `ollamaagentalfa-v2-experiment` project and ports them into the canonical Python backend.

## What was ported

- Briefcase status endpoint
- in-memory project registry
- project scaffold creation
- file update API
- build API using `briefcase build <platform>`
- run API using `briefcase dev`
- ZIP export
- project deletion

## What was intentionally not ported

- arbitrary shell execution from `/api/exec`
- generic execution pipeline endpoints
- the unfinished React/Lovable frontend

## Endpoints

- `GET /api/briefcase/status`
- `GET /api/briefcase/projects`
- `POST /api/briefcase/projects`
- `PUT /api/briefcase/projects/{id}/files`
- `POST /api/briefcase/projects/{id}/build`
- `POST /api/briefcase/projects/{id}/run`
- `GET /api/briefcase/projects/{id}/export`
- `DELETE /api/briefcase/projects/{id}`

## Notes

- project storage is local and ephemeral by default
- set `ALFA_BRIEFCASE_PROJECTS_DIR` to control the storage directory
- build and run require a local Briefcase installation
- the current implementation is a safe backend foundation for a future web panel
