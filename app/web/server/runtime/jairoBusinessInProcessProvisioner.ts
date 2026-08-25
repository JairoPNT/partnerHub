import { createCloudflareDnsClient, getCloudflareDnsConfig } from "../integrations/cloudflareDnsClient";
import { createHostingerSubdomainClient, getHostingerSubdomainConfig } from "../integrations/hostingerSubdomainClient";
import { createSubdomainProvisioningService, type ProvisionSubdomainInput } from "../services/subdomainProvisioningService";

export async function provisionJairoBusinessInProcess(raw: Omit<ProvisionSubdomainInput, "ipv4">, environment: NodeJS.ProcessEnv = process.env) {
  const ipv4 = environment.PARTNERHUB_PROVISIONING_IPV4?.trim();
  if (!ipv4) throw new Error("PARTNERHUB_PROVISIONING_IPV4_MISSING");
  const service = createSubdomainProvisioningService({
    hostingerClient: createHostingerSubdomainClient(getHostingerSubdomainConfig(environment)),
    dnsClient: createCloudflareDnsClient(getCloudflareDnsConfig(environment))
  });
  return service.provision({ ...raw, ipv4 });
}
