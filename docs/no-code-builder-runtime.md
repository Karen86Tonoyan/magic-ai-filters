# No-Code Builder Runtime Slice

This repository now includes a first safe backend slice for an agent-driven no-code builder inside the canonical Python backend.

## What is implemented

- schema models in `packages/schemas/nocode.py`
- guardian validation in `packages/safety/guardian.py`
- in-memory deploy and execute runtime in `packages/core/nocode_runtime.py`
- API endpoints in `apps/api/main.py`

## Supported endpoints

- `POST /api/apps/deploy`
- `POST /api/apps/{id}/execute`
- `GET /api/apps/{id}/state`

## Supported runtime actions

- `log_event`
- `notify_user`
- `quiet_phone`
- `raise_alarm`
- `require_passcode`
- `revoke_token`
- `send_cloud_signal`
- `sleep_mode`
- `lock_safe`

## Explicitly blocked actions

- `unlock_device`
- `disable_lockscreen`
- `bypass_biometric`
- `open_safe`
- `unencrypt_keys`
- `export_raw_tokens`

## Safety notes

- wearable, sleep, and heart-rate telemetry are treated as assistive signals only
- biometric signals may inform alerts, but they cannot weaken authentication
- physical security flows are expected to fail closed and rely on attested coordination

## Current limitations

- runtime storage is in memory only
- websocket live updates are not implemented yet
- there are no real phone, watch, or cloud provider integrations yet
- runtime execution updates internal state and emitted actions only
