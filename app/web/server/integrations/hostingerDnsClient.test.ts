import assert from "node:assert/strict";
import test from "node:test";
import { createHostingerDnsClient, HostingerDnsError } from "./hostingerDnsClient.ts";

const config = { apiToken: "test-token", baseUrl: "https://developers.hostinger.com" };
const record = { type: "A" as const, name: "producto.jairopinto.pro", content: "82.29.157.103", ttl: 300 };
const zone = (value = record) => [{ name: "producto", type: "A", ttl: value.ttl, records: [{ content: value.content, is_disabled: false }] }];
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("does not mutate an existing matching Hostinger DNS record", async () => {
  const calls: RequestInit[] = []; const urls: string[] = []; const client = createHostingerDnsClient(config, async (input, init = {}) => { urls.push(String(input)); calls.push(init); return response(zone()); });
  const result = await client.ensureARecord("jairopinto.pro", record.name, record.content); assert.equal(result.state, "EXISTING"); assert.equal(calls.length, 1);
  assert.equal(urls[0], "https://developers.hostinger.com/api/dns/v1/zones/jairopinto.pro");
});
test("creates a missing record once", async () => {
  const replies = [response([]), response({ message: "Request accepted" }), response(zone())]; const methods: string[] = []; const bodies: unknown[] = []; const client = createHostingerDnsClient(config, async (_input, init = {}) => { methods.push(init.method ?? "GET"); if (init.body) bodies.push(JSON.parse(String(init.body))); return replies.shift()!; });
  assert.equal((await client.ensureARecord("jairopinto.pro", record.name, record.content)).state, "CREATED"); assert.deepEqual(methods, ["GET", "PUT", "GET"]);
  assert.deepEqual(bodies[0], { overwrite: false, zone: [{ type: "A", name: "producto", records: [{ content: "82.29.157.103" }], ttl: 300 }] });
});
test("detects conflicts without mutation and protects zone boundaries", async () => {
  const client = createHostingerDnsClient(config, async () => response(zone({ ...record, content: "203.0.113.10" })));
  await assert.rejects(() => client.ensureARecord("jairopinto.pro", record.name, record.content), (error: unknown) => error instanceof HostingerDnsError && error.code === "HOSTINGER_DNS_CONFLICT");
  await assert.rejects(() => client.ensureARecord("jairopinto.pro", "producto.ganomaster.pro", record.content), /outside the requested zone/);
});
