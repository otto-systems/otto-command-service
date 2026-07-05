# Otto Command Service

`otto-command-service` is the standalone source of truth for Otto command contracts.

All command schemas, handler bindings, and surface generators live here and are consumed by the rest of the Otto repositories.

## Repository Structure
- `src/schemas/` – canonical command schemas
- `src/handlers/` – handler modules referenced by schema routing metadata
- `src/generators/cli-generator/` – CLI surface generator
- `src/generators/api-generator/` – API surface generator
- `src/index.ts` – schema loading and command execution helpers
- `tests/` – command-service validation tests

## Generation Workflow
- Generate API surface for `otto-update`:
	- `npm run generate:api`
- Generate CLI surface for `otto-update`:
	- `npm run generate:cli`
- Generate both:
	- `npm run generate:surfaces`

Generated outputs are written to:
- `../otto-update/src/generated_api/index.ts`
- `../otto-update/src/generated_cli/index.ts`

The generated API surface resolves handler modules from this standalone repo, so `otto-update` remains a consumer of generated artifacts rather than a source of command definitions.

## How Other Repos Should Import
- Node repos can load schemas directly:
	- `import { loadCommandSchemas } from "@otto/command-service";`
- `otto-update` consumes generated surfaces only:
	- `src/generated_cli/index.ts`
	- `src/generated_api/index.ts`
- No repository should define standalone command schemas outside this repo.

## Verified Consumers
- `otto-update` uses the generated CLI/API surfaces and the sibling file dependency.
- `otto-kernel` loads command schemas from `@otto/command-service`.
- `otto-extensions` loads command schemas from `@otto/command-service`.
- `Maestro` validates required Maestro command contracts from `@otto/command-service`.

Current migration evidence is recorded in `../otto-update/docs/` because the Otto workspace root is not itself a git repository.
