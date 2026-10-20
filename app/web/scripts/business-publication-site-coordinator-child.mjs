import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createBusinessPublicationSiteCoordinator } from "../server/services/businessPublicationSiteCoordinator.ts";

const directory = process.argv[2];
const withSite = createBusinessPublicationSiteCoordinator({ outputDirectory: directory });
if (process.argv[3] === "worker") {
  process.env.PRODUCT_PAGE_OUTPUT_DIR = directory;
  process.env.PRODUCT_PAGE_SOURCE_DIR = resolve(directory, ".sources");
  const { createPublicationJobService } = await import("../server/services/publicationJobService.ts");
  const { createPublicationJobWorker } = await import("../server/services/publicationJobWorkerService.ts");
  const jobs = createPublicationJobService({
    outputDirectory: directory, sourceDirectory: resolve(directory, ".sources"), jobDirectory: resolve(directory, ".jobs"),
    now: () => new Date("2026-10-20T12:01:00Z")
  });
  const result = await createPublicationJobWorker({ jobs, execution: { async execute(_job, advance) {
    const release = new Promise((done) => process.once("message", done));
    process.send("entered");
    await release;
    for (const phase of ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING"]) await advance(phase);
    return {};
  } } }).runNext();
  process.send(result.outcome);
} else await withSite("ana-business", async () => {
  const root = resolve(directory, ".business-publication-site-claims");
  const [name] = await readdir(root);
  const ownerPath = resolve(root, name, "owner.json");
  const owner = JSON.parse(await readFile(ownerPath, "utf8"));
  await writeFile(ownerPath, JSON.stringify({ ...owner, acquiredAt: "2000-01-01T00:00:00.000Z" }));
  const release = new Promise((done) => process.once("message", done));
  process.send("entered");
  await release;
});
process.disconnect();
