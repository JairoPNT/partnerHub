import assert from "node:assert/strict";
import test from "node:test";

import {
  createHostingerSubdomainClient,
  HostingerApiError
} from "./hostingerSubdomainClient.ts";

const config = {
  apiToken: "test-token-not-a-secret",
  username: "u658137804",
  baseUrl: "https://developers.hostinger.com"
};

const matchingResource = {
  username: "u658137804",
  domain: "producto.lidacastaneda.pro",
  parent_domain: "lidacastaneda.pro",
  root_directory: "/home/u658137804/domains/producto.lidacastaneda.pro/public_html",
  subdomain: "producto"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("returns an existing matching subdomain without creating it", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createHostingerSubdomainClient(config, async (input, init) => {
    calls.push({ url: input.toString(), init });
    return jsonResponse([matchingResource]);
  });

  const result = await client.ensure("lidacastaneda.pro", "producto");

  assert.equal(result.state, "EXISTING");
  assert.equal(result.subdomain.root_directory, matchingResource.root_directory);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.init?.method, undefined);
});

test("creates a missing subdomain once and confirms it", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [jsonResponse([]), jsonResponse({}), jsonResponse([matchingResource])];
  const client = createHostingerSubdomainClient(config, async (input, init) => {
    calls.push({ url: input.toString(), init });
    const response = responses.shift();
    assert.ok(response);
    return response;
  });

  const result = await client.ensure("lidacastaneda.pro", "producto");

  assert.equal(result.state, "CREATED");
  assert.deepEqual(
    calls.map((call) => call.init?.method ?? "GET"),
    ["GET", "POST", "GET"]
  );
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    subdomain: "producto",
    directory: null,
    is_using_public_directory: false
  });
});

test("normalizes rejected credentials without exposing the token", async () => {
  const client = createHostingerSubdomainClient(config, async () =>
    jsonResponse({ error: "Unauthorized", correlation_id: "corr-auth" }, 401)
  );

  await assert.rejects(
    () => client.list("lidacastaneda.pro"),
    (error: unknown) => {
      assert.ok(error instanceof HostingerApiError);
      assert.equal(error.code, "HOSTINGER_AUTH_FAILED");
      assert.equal(error.correlationId, "corr-auth");
      assert.equal(error.message.includes(config.apiToken), false);
      return true;
    }
  );
});

test("normalizes provider failures and preserves a safe correlation id", async () => {
  const client = createHostingerSubdomainClient(config, async () =>
    jsonResponse({ error: "Provider failed", correlation_id: "corr-provider" }, 500)
  );

  await assert.rejects(
    () => client.list("lidacastaneda.pro"),
    (error: unknown) => {
      assert.ok(error instanceof HostingerApiError);
      assert.equal(error.code, "HOSTINGER_PROVIDER_ERROR");
      assert.equal(error.correlationId, "corr-provider");
      return true;
    }
  );
});

test("rejects a conflicting document root without a create request", async () => {
  const calls: Array<RequestInit | undefined> = [];
  const client = createHostingerSubdomainClient(config, async (_input, init) => {
    calls.push(init);
    return jsonResponse([
      {
        ...matchingResource,
        root_directory: "/home/u658137804/domains/lidacastaneda.pro/public_html/producto"
      }
    ]);
  });

  await assert.rejects(
    () => client.ensure("lidacastaneda.pro", "producto"),
    (error: unknown) => {
      assert.ok(error instanceof HostingerApiError);
      assert.equal(error.code, "HOSTINGER_SUBDOMAIN_CONFLICT");
      return true;
    }
  );
  assert.equal(calls.length, 1);
});
