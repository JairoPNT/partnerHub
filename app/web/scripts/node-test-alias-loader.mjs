import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export default {};", shortCircuit: true };
  }
  if (specifier === "next/server") return nextResolve("next/server.js", context);
  if (specifier.startsWith("@/")) {
    const base = resolvePath(process.cwd(), specifier.slice(2));
    const candidate = [base, `${base}.ts`, `${base}.mjs`].find(existsSync);
    if (!candidate) throw new Error(`TEST_ALIAS_NOT_FOUND:${specifier}`);
    return { url: pathToFileURL(candidate).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
