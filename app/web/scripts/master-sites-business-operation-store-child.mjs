import { createMasterSitesBusinessOperationStore } from "../server/services/masterSitesBusinessOperationStore.ts";
import fs from "node:fs/promises";

const [directory, mode] = process.argv.slice(2);
const store = createMasterSitesBusinessOperationStore({ directory });
if (mode === "hold-create") {
  const rename = fs.rename.bind(fs);
  fs.rename = async (...args) => {
    const release = new Promise((done) => process.once("message", done));
    process.send("entered");
    await release;
    await rename(...args);
  };
}
const binding = {
  requestId: "00000000-0000-4000-8000-000000000001", actorHash: "a".repeat(64), action: "PUBLISH",
  activationLeadId: "00000000-0000-4000-8000-000000000002", siteId: "ana-business",
  templateId: "ganomaster-business", expectedRevision: "b".repeat(64), updateExisting: false
};
process.once("message", async () => {
  try {
    if (mode === "create" || mode === "hold-create") {
      const { created } = await store.create(binding);
      process.send({ created });
    } else {
      const operation = await store.checkpoint(binding.requestId, 0, { phase: "GENERATED" });
      process.send({ version: operation.version });
    }
  } catch (error) { process.send({ error: error.code ?? "UNEXPECTED" }); }
  finally { process.disconnect(); }
});
process.send("ready");
