# Otto Command Service MemPalace

Created: 2026-09-01
Purpose: Memory for command contract handling, orchestrator persistence shape, and deployment behavior.

## Contract Discipline

- Keep command payload normalization deterministic and backward-compatible.
- Preserve persisted settings fields when introducing new orchestrator controls.

## Orchestrator Persistence Notes

- Settings shape now includes tierNames, playlistOrder, shuffleSeed, and manualPageOrder.
- Tier list updates must keep related settings fields consistent.

## Deployment Lesson

- 2026-09-01: New command/runtime routes may not activate until the running process is restarted after deploy.
