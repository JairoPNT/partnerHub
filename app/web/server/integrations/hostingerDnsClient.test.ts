import assert from "node:assert/strict";
import test from "node:test";
import { createHostingerDnsClient, HostingerDnsError } from "./hostingerDnsClient.ts";

const config = { apiToken: "test-token", baseUrl: "https://developers.hostinger.com" };
const record = { id: "record-1", type: "A", name: "producto.jairopinto.pro", content: "82.29.157.103", ttl: 300 };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("does not mutate an existing matching Hostinger DNS record", async () => {
  const calls: RequestInit[] = []; const client = createHostingerDnsClient(config, async (_input, init = {}) => { calls.push(init); return response([record]); });
  const result = await client.ensureARecord("jairopinto.pro", record.name, record.content); assert.equal(result.state, "EXISTING"); assert.equal(calls.length, 1);
});
test("creates a missing record once", async () => {
  const replies = [response([]), response(record)]; const methods: string[] = []; const client = createHostingerDnsClient(config, async (_input, init = {}) => { methods.push(init.method ?? "GET"); return replies.shift()!; });
  assert.equal((await client.ensureARecord("jairopinto.pro", record.name, record.content)).state, "CREATED"); assert.deepEqual(methods, ["GET", "POST"]);
});
test("detects conflicts without mutation and protects zone boundaries", async () => {
  const client = createHostingerDnsClient(config, async () => response([{ ...record, content: "203.0.113.10" }]));
  await assert.rejects(() => client.ensureARecord("jairopinto.pro", record.name, record.content), (error: unknown) => error instanceof HostingerDnsError && error.code === "HOSTINGER_DNS_CONFLICT");
  await assert.rejects(() => client.ensureARecord("jairopinto.pro", "producto.ganomaster.pro", record.content), /outside the requested zone/);
});
