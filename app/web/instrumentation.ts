export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startPublicationJobWorkerLoop } = await import("@/server/services/publicationJobWorkerService");
  startPublicationJobWorkerLoop();
}
