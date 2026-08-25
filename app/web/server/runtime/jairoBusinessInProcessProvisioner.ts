import { createHostingerDnsClient } from "../integrations/hostingerDnsClient";
import { createHostingerSubdomainClient, getHostingerSubdomainConfig } from "../integrations/hostingerSubdomainClient";
import { createSubdomainProvisioningService, type ProvisionSubdomainInput } from "../services/subdomainProvisioningService";

export async function provisionJairoBusinessInProcess(raw: Omit<ProvisionSubdomainInput, "ipv4">, environment: NodeJS.ProcessEnv = process.env) {
  const ipv4 = environment.PARTNERHUB_PROVISIONING_IPV4?.trim();
  if (!ipv4) throw new Error("PARTNERHUB_PROVISIONING_IPV4_MISSING");
  const service = createSubdomainProvisioningService({
    hostingerClient: createHostingerSubdomainClient(getHostingerSubdomainConfig(environment)),
    dnsClient: createHostingerDnsClient({
      apiToken: environment.HOSTINGER_API_TOKEN?.trim() || "",
      baseUrl: environment.HOSTINGER_API_BASE_URL
    })
  });
  return service.provision({ ...raw, ipv4 });
}
