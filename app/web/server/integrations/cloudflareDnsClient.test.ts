import assert from "node:assert/strict";
import test from "node:test";

import { CloudflareDnsError, createCloudflareDnsClient } from "./cloudflareDnsClient.ts";

const config = {
  apiToken: "test-token-not-a-secret",
  zoneId: "0123456789abcdef0123456789abcdef",
  baseUrl: "https://api.cloudflare.com/client/v4"
};

const matchingRecord = {
  id: "record-1",
  type: "A" as const,
  name: "producto.lidacastaneda.pro",
  content: "82.29.157.103",
  proxied: false,
  ttl: 1
};

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

test("returns an existing exact DNS record without creating it", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createCloudflareDnsClient(config, async (input, init) => {
    calls.push({ url: input.toString(), init });
    return jsonResponse({ success: true, result: [matchingRecord] });
  });

  const result = await client.ensureARecord(matchingRecord.name, matchingRecord.content);

  assert.equal(result.state, "EXISTING");
  assert.equal(calls.length, 1);
  assert.match(calls[0]?.url ?? "", /name=producto/);
  assert.equal(calls[0]?.init?.method, undefined);
});

test("creates one missing DNS-only A record", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    jsonResponse({ success: true, result: [] }),
    jsonResponse({ success: true, result: matchingRecord })
  ];
  const client = createCloudflareDnsClient(config, async (input, init) => {
    calls.push({ url: input.toString(), init });
    const response = responses.shift();
    assert.ok(response);
    return response;
  });

  const result = await client.ensureARecord(matchingRecord.name, matchingRecord.content);

  assert.equal(result.state, "CREATED");
  assert.deepEqual(calls.map((call) => call.init?.method ?? "GET"), ["GET", "POST"]);
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    type: "A",
    name: matchingRecord.name,
    content: matchingRecord.content,
    ttl: 1,
    proxied: false,
    comment: "Managed by PartnerHub"
  });
});

test("rejects conflicting DNS content without mutation", async () => {
  const calls: Array<RequestInit | undefined> = [];
  const client = createCloudflareDnsClient(config, async (_input, init) => {
    calls.push(init);
    return jsonResponse({ success: true, result: [{ ...matchingRecord, content: "192.0.2.10" }] });
  });

  await assert.rejects(
    () => client.ensureARecord(matchingRecord.name, matchingRecord.content),
    (error: unknown) => {
      assert.ok(error instanceof CloudflareDnsError);
      assert.equal(error.code, "CLOUDFLARE_DNS_CONFLICT");
      return true;
    }
  );
  assert.equal(calls.length, 1);
});

test("rejects a CNAME occupying the hostname without mutation", async () => {
  const calls: Array<RequestInit | undefined> = [];
  const client = createCloudflareDnsClient(config, async (_input, init) => {
    calls.push(init);
    return jsonResponse({
      success: true,
      result: [
        {
          ...matchingRecord,
          type: "CNAME",
          content: "example.hostinger.test"
        }
      ]
    });
  });

  await assert.rejects(
    () => client.ensureARecord(matchingRecord.name, matchingRecord.content),
    (error: unknown) => {
      assert.ok(error instanceof CloudflareDnsError);
      assert.equal(error.code, "CLOUDFLARE_DNS_CONFLICT");
      return true;
    }
  );
  assert.equal(calls.length, 1);
});

test("normalizes rejected credentials without exposing the token", async () => {
  const client = createCloudflareDnsClient(config, async () =>
    jsonResponse(
      { success: false, errors: [{ code: 10000, message: "Authentication error" }] },
      403,
      { "cf-ray": "ray-auth" }
    )
  );

  await assert.rejects(
    () => client.find(matchingRecord.name),
    (error: unknown) => {
      assert.ok(error instanceof CloudflareDnsError);
      assert.equal(error.code, "CLOUDFLARE_AUTH_FAILED");
      assert.equal(error.providerCode, 10000);
      assert.equal(error.correlationId, "ray-auth");
      assert.equal(error.message.includes(config.apiToken), false);
      return true;
    }
  );
});

test("fails safely on an invalid success envelope", async () => {
  const client = createCloudflareDnsClient(config, async () => jsonResponse({ success: true }));

  await assert.rejects(
    () => client.find(matchingRecord.name),
    (error: unknown) => {
      assert.ok(error instanceof CloudflareDnsError);
      assert.equal(error.code, "CLOUDFLARE_INVALID_RESPONSE");
      return true;
    }
  );
});
