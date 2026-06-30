# Otto Command Service

The Otto Command Service defines the command contract for Otto.  
It provides the registry, validation rules, routing logic, and permission model that all commands—core and extension—must follow.

## Responsibilities
- Define the command manifest schema
- Validate command manifests at registration time
- Route commands to kernel, update engine, or extensions
- Enforce command permissions and safety policies
- Provide a stable API surface for clients and modules

## Planned Structure
- `src/core/` – core command registry, routing, and validation
- `src/cli/` – CLI interface for command execution
- `docs/` – command schemas, routing rules, and OpenAPI specs
- `prompts/` – Copilot prompt packs (added later)
