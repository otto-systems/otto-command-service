import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type CommandSchema = {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	returnType: Record<string, unknown>;
	errorTypes: string[];
	permissions: string[];
	routing: {
		handlerModule: string;
		handlerExport: string;
		exposedAs: string[];
		http: { method: string; path: string };
	};
};

function srcRoot(): string {
	return path.dirname(fileURLToPath(import.meta.url));
}

export function commandSchemasPath(): string {
	return path.join(srcRoot(), "schemas");
}

export function commandHandlersPath(): string {
	return path.join(srcRoot(), "handlers");
}

export async function loadCommandSchemas(): Promise<CommandSchema[]> {
	const schemasDir = commandSchemasPath();
	const files = (await fs.readdir(schemasDir)).filter((entry) => entry.endsWith(".json")).sort();
	const schemas: CommandSchema[] = [];

	for (const file of files) {
		const raw = await fs.readFile(path.join(schemasDir, file), "utf8");
		schemas.push(JSON.parse(raw) as CommandSchema);
	}

	return schemas;
}

export async function executeCommand(commandName: string, params: Record<string, unknown> = {}): Promise<unknown> {
	const schemas = await loadCommandSchemas();
	const schema = schemas.find((entry) => entry.name === commandName);
	if (!schema) {
		throw new Error(`Unknown command: ${commandName}`);
	}

	const modulePath = path.join(commandHandlersPath(), schema.routing.handlerModule);
	const mod = await import(pathToFileURL(modulePath).href);
	const fn = mod[schema.routing.handlerExport];

	if (typeof fn !== "function") {
		throw new Error(`Handler export not found for command ${commandName}: ${schema.routing.handlerExport}`);
	}

	return fn(params);
}
