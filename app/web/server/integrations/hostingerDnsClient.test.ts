import assert from "node:assert/strict";
import test from "node:test";
import { createHostingerDnsClient, HostingerDnsError } from "./hostingerDnsClient.ts";

const config = { apiToken: "test-token", baseUrl: "https://developers.hostinger.com" };
const record = { id: "hostinger-zone:jairopinto.pro:producto.jairopinto.pro:A", type: "A" as const, name: "producto.jairopinto.pro", content: "82.29.157.103", ttl: 300 };
const zone = (value = record) => [{ name: "producto", type: "A", ttl: value.ttl, records: [{ content: value.content, is_disabled: false }] }];
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("does not mutate an existing matching Hostinger DNS record", async () => {
  const calls: RequestInit[] = []; const urls: string[] = []; const client = createHostingerDnsClient(config, async (input, init = {}) => { urls.push(String(input)); calls.push(init); return response(zone()); });
  const result = await client.ensureARecord("jairopinto.pro", record.name, record.content); assert.equal(result.state, "EXISTING"); assert.equal(result.routingMode, "DIRECT_A"); assert.equal(calls.length, 1);
  assert.equal(urls[0], "https://developers.hostinger.com/api/dns/v1/zones/jairopinto.pro");
});
test("creates a missing record once", async () => {
  const replies = [response([]), response({ message: "Request accepted" }), response(zone())]; const methods: string[] = []; const bodies: unknown[] = []; const client = createHostingerDnsClient(config, async (_input, init = {}) => { methods.push(init.method ?? "GET"); if (init.body) bodies.push(JSON.parse(String(init.body))); return replies.shift()!; });
  const result = await client.ensureARecord("jairopinto.pro", record.name, record.content);
  assert.equal(result.state, "CREATED"); assert.equal(result.routingMode, "DIRECT_A"); assert.deepEqual(methods, ["GET", "PUT", "GET"]);
  assert.deepEqual(bodies[0], { overwrite: false, zone: [{ type: "A", name: "producto", records: [{ content: "82.29.157.103" }], ttl: 300 }] });
});

test("accepts one exact enabled Hostinger ALIAS without making a DNS write", async () => {
  const methods: string[] = [];
  const client = createHostingerDnsClient(config, async (_input, init = {}) => {
    methods.push(init.method ?? "GET");
    return response([{ name: "negocio", type: "ALIAS", ttl: 300, records: [{ content: "provider-managed-value", is_disabled: false }] }]);
  });
  const result = await client.ensureARecord("jairopinto.pro", "negocio.jairopinto.pro", record.content);
  assert.equal(result.state, "EXISTING_ALIAS");
  assert.equal(result.routingMode, "HOSTINGER_ALIAS");
  assert.deepEqual(result.record, {
    id: "hostinger-zone:jairopinto.pro:negocio.jairopinto.pro:ALIAS",
    type: "ALIAS",
    name: "negocio.jairopinto.pro",
    ttl: 300
  });
  assert.deepEqual(methods, ["GET"]);
  assert.equal("content" in result.record, false);
});

test("blocks ambiguous, disabled, mixed and non-ALIAS hostname occupancy without mutation", async () => {
  const cases = [
    [{ name: "negocio", type: "ALIAS", records: [{ content: "one" }, { content: "two" }] }],
    [{ name: "negocio", type: "ALIAS", records: [{ content: "one", is_disabled: true }] }],
    [{ name: "negocio", type: "ALIAS", records: [{ content: "one" }] }, { name: "negocio", type: "A", records: [{ content: record.content }] }],
    [{ name: "negocio", type: "CNAME", records: [{ content: "example.com" }] }]
  ];
  for (const value of cases) {
    const methods: string[] = [];
    const client = createHostingerDnsClient(config, async (_input, init = {}) => { methods.push(init.method ?? "GET"); return response(value); });
    await assert.rejects(
      () => client.ensureARecord("jairopinto.pro", "negocio.jairopinto.pro", record.content),
      (error: unknown) => error instanceof HostingerDnsError && error.code === "HOSTINGER_DNS_CONFLICT"
    );
    assert.deepEqual(methods, ["GET"]);
  }
});
test("detects conflicts without mutation and protects zone boundaries", async () => {
  const client = createHostingerDnsClient(config, async () => response(zone({ ...record, content: "203.0.113.10" })));
  await assert.rejects(() => client.ensureARecord("jairopinto.pro", record.name, record.content), (error: unknown) => error instanceof HostingerDnsError && error.code === "HOSTINGER_DNS_CONFLICT");
  await assert.rejects(() => client.ensureARecord("jairopinto.pro", "producto.ganomaster.pro", record.content), /outside the requested zone/);
});
