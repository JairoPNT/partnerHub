import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createSubdomainProvisioningService,
  ProvisioningError
} from "./subdomainProvisioningService.ts";

const ownerKey = "cb841c76-4f50-4ee7-90bb-021094e5c1f7";
const baseInput = {
  ownerKey,
  siteId: "lida-castaneda-product",
  ecosystemType: "PRODUCT" as const,
  baseDomain: "lidacastaneda.pro",
  ipv4: "82.29.157.103",
  confirmation: "PROVISION_SUBDOMAIN" as const
};

const hostingerResult = {
  state: "CREATED" as const,
  subdomain: {
    username: "u658137804",
    domain: "producto.lidacastaneda.pro",
    parent_domain: "lidacastaneda.pro",
    root_directory: "/home/u658137804/domains/producto.lidacastaneda.pro/public_html",
    subdomain: "producto"
  }
};

const dnsResult = {
  state: "CREATED" as const,
  record: {
    id: "dns-record-1",
    type: "A" as const,
    name: "producto.lidacastaneda.pro",
    content: "82.29.157.103",
    proxied: false,
    ttl: 1
  }
};

async function withDirectory(
  run: (directory: string) => Promise<void>
) {
  const directory = await mkdtemp(join(tmpdir(), "partnerhub-provisioning-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("requires explicit confirmation before any provider call", async () => {
  let providerCalls = 0;
  const service = createSubdomainProvisioningService({
    storageDirectory: join(tmpdir(), "unused-partnerhub-provisioning"),
    hostingerClient: { ensure: async () => { providerCalls += 1; return hostingerResult; } },
    dnsClient: { ensureARecord: async () => { providerCalls += 1; return dnsResult; } }
  });

  await assert.rejects(() => service.provision({ ...baseInput, confirmation: "INVALID" as never }));
  assert.equal(providerCalls, 0);
});

test("persists a complete mocked provisioning run as READY", async () => {
  await withDirectory(async (directory) => {
    const service = createSubdomainProvisioningService({
      storageDirectory: directory,
      hostingerClient: { ensure: async () => hostingerResult },
      dnsClient: { ensureARecord: async () => dnsResult },
      readinessProbe: {
        dnsResolves: async () => true,
        httpsReady: async () => true
      },
      now: () => new Date("2026-08-07T12:00:00.000Z")
    });

    const target = await service.provision(baseInput);
    const persisted = JSON.parse(await readFile(join(directory, `${baseInput.siteId}.json`), "utf8"));

    assert.equal(target.provisioningState, "READY");
    assert.equal(target.dnsState, "RESOLVED");
    assert.equal(target.sslState, "READY");
    assert.equal(persisted.remoteRoot, hostingerResult.subdomain.root_directory);
    assert.equal("apiToken" in persisted, false);
  });
});

test("resumes DNS_PENDING and reaches READY on retry", async () => {
  await withDirectory(async (directory) => {
    let dnsReady = false;
    let hostingerCalls = 0;
    let dnsCalls = 0;
    const service = createSubdomainProvisioningService({
      storageDirectory: directory,
      hostingerClient: { ensure: async () => { hostingerCalls += 1; return hostingerResult; } },
      dnsClient: { ensureARecord: async () => { dnsCalls += 1; return dnsResult; } },
      readinessProbe: {
        dnsResolves: async () => dnsReady,
        httpsReady: async () => true
      }
    });

    const pending = await service.provision(baseInput);
    assert.equal(pending.provisioningState, "DNS_PENDING");

    dnsReady = true;
    const ready = await service.provision(baseInput);
    assert.equal(ready.provisioningState, "READY");
    assert.equal(hostingerCalls, 2);
    assert.equal(dnsCalls, 2);
  });
});

test("persists a safe FAILED state and resumes after provider recovery", async () => {
  await withDirectory(async (directory) => {
    let shouldFail = true;
    const providerError = Object.assign(new Error("secret provider detail"), {
      code: "HOSTINGER_AUTH_FAILED"
    });
    const service = createSubdomainProvisioningService({
      storageDirectory: directory,
      hostingerClient: {
        ensure: async () => {
          if (shouldFail) throw providerError;
          return hostingerResult;
        }
      },
      dnsClient: { ensureARecord: async () => dnsResult },
      readinessProbe: {
        dnsResolves: async () => true,
        httpsReady: async () => true
      }
    });

    await assert.rejects(
      () => service.provision(baseInput),
      (error: unknown) => {
        assert.ok(error instanceof ProvisioningError);
        assert.equal(error.code, "PROVISIONING_PROVIDER_FAILED");
        assert.equal(error.message.includes("secret provider detail"), false);
        return true;
      }
    );
    assert.equal((await service.get(baseInput.siteId))?.provisioningState, "FAILED");
    assert.equal((await service.get(baseInput.siteId))?.lastErrorCode, "HOSTINGER_AUTH_FAILED");

    shouldFail = false;
    assert.equal((await service.provision(baseInput)).provisioningState, "READY");
  });
});

test("rejects immutable identity and duplicate owner ecosystem conflicts", async () => {
  await withDirectory(async (directory) => {
    let providerCalls = 0;
    const service = createSubdomainProvisioningService({
      storageDirectory: directory,
      hostingerClient: { ensure: async () => { providerCalls += 1; return hostingerResult; } },
      dnsClient: { ensureARecord: async () => { providerCalls += 1; return dnsResult; } },
      readinessProbe: {
        dnsResolves: async () => false,
        httpsReady: async () => false
      }
    });

    await service.provision(baseInput);
    const callsAfterFirstTarget = providerCalls;

    await assert.rejects(
      () => service.provision({ ...baseInput, baseDomain: "otherdomain.pro" }),
      (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_TARGET_CONFLICT"
    );
    await assert.rejects(
      () => service.provision({ ...baseInput, siteId: "lida-second-product" }),
      (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_TARGET_CONFLICT"
    );
    assert.equal(providerCalls, callsAfterFirstTarget);
  });
});
