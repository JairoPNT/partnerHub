// Build-only normalizer, never shipped. These are fixed Docker build paths,
// not deployment/configuration inputs. Preserve every selected traced byte.
import { lstat, mkdir, readFile, readdir, realpath, writeFile, chmod } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const standalone = "/repo/app/web/.next/standalone";
const dependencies = "/repo/app/web/node_modules";
const destination = "/repo/business-cutover-standalone";
const invalid = () => new Error("BUSINESS_CUTOVER_RUNTIME_LAYOUT_INVALID");
async function stat(path) {
  try { return await lstat(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
const samePath = (a, b) => relative(a, b) === "";

export async function assembleBusinessCutoverStandalone() {
  try {
    const flat = await stat(join(standalone, "server.js")), nested = await stat(join(standalone, "app/web/server.js"));
    if (!!flat === !!nested || (flat && (!flat.isFile() || flat.isSymbolicLink())) ||
      (nested && (!nested.isFile() || nested.isSymbolicLink()))) throw invalid();
    if (!samePath(await realpath(standalone), resolve(standalone))) throw invalid();
    const selected = flat ? standalone : join(standalone, "app/web");
    if (!samePath(await realpath(selected), resolve(selected))) throw invalid();
    await mkdir(destination, { mode: 0o755 }); // no overwrite/reuse of an old assembly
    const active = new Set();
    async function copy(source, target, name = "") {
      // Next's known whole-project trace includes this build-only helper.
      // Omit this EXACT file at assembly, not via an inventory exception.
      if (name === "scripts/assemble-business-cutover-runtime.mjs") return;
      let info = await lstat(source);
      if (info.isSymbolicLink()) {
        // Only the three Next-generated dependency aliases observed in the
        // reviewed layout. Unknown links require an explicit packaging review.
        const match = /^\.next\/node_modules\/(cpu-features|sharp|@aws-sdk\/client-s3)-[a-f0-9]{16}$/.exec(name);
        if (!match) throw invalid();
        const physical = await realpath(source), packageRoot = join(dependencies, match[1]);
        const physicalDependencies = await realpath(dependencies);
        if (!samePath(physicalDependencies, resolve(dependencies)) || !samePath(physical, packageRoot) ||
          relative(physicalDependencies, physical).startsWith(`..${sep}`)) throw invalid();
        source = physical; info = await lstat(source);
        if (!info.isDirectory() || info.isSymbolicLink()) throw invalid();
      }
      if (info.isDirectory()) {
        const physical = await realpath(source); if (active.has(physical)) throw invalid(); active.add(physical);
        const existing = await stat(target);
        if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw invalid();
        if (!existing) await mkdir(target, { mode: 0o755 });
        for (const child of (await readdir(source)).sort()) await copy(join(source, child), join(target, child), name ? `${name}/${child}` : child);
        active.delete(physical); return;
      }
      if (!info.isFile()) throw invalid();
      const bytes = await readFile(source), existing = await stat(target);
      if (existing) {
        if (!existing.isFile() || existing.isSymbolicLink() || !bytes.equals(await readFile(target))) throw invalid();
      } else {
        await writeFile(target, bytes, { flag: "wx", mode: 0o644 });
        // Preserve executability without carrying writable modes/hardlinks.
        await chmod(target, info.mode & 0o111 ? 0o755 : 0o644);
      }
    }
    await copy(selected, destination);
    const rootDependencies = join(standalone, "node_modules");
    if (nested && await stat(rootDependencies)) await copy(rootDependencies, join(destination, "node_modules"), "node_modules");
  } catch { throw invalid(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 2) throw invalid();
  await assembleBusinessCutoverStandalone();
}
