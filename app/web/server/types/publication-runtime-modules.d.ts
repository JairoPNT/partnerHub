declare module "*.mjs" {
  export const APPLY_MODE: string;
  export const APPLY_CONFIRMATION: string;
  export const PROBE_MODE: string;
  export const PROBE_CONFIRMATION: string;
  export function createSftpAdapter(environment?: NodeJS.ProcessEnv): Promise<PublicationSftpAdapter>;
  export function planGuardedPublication(options: Record<string, unknown>): Promise<Record<string, any>>;
  export function runGuardedPublication(options: Record<string, unknown>): Promise<Record<string, any>>;
  export function verifyPublicPackage(entry: Record<string, unknown>, source: unknown, fetcher?: typeof fetch): Promise<{ passed: boolean; reasons: string[] }>;
  export function planSftpCapabilityProbe(options: Record<string, unknown>): Promise<Record<string, any>>;
  export function runSftpCapabilityProbe(options: Record<string, unknown>): Promise<Record<string, any>>;
}

type PublicationSftpInventory = {
  exists: boolean;
  files: Array<{ path: string; hash: string }>;
  hash: string;
};

type PublicationSftpAdapter = {
  inventory(path: string): Promise<PublicationSftpInventory>;
  mkdir(path: string, recursive: boolean): Promise<unknown>;
  writeFile(path: string, value: Buffer): Promise<unknown>;
  readFile(path: string): Promise<Buffer>;
  put(local: string, remote: string): Promise<void>;
  rename(from: string, to: string): Promise<unknown>;
  remove(path: string, recursive: boolean): Promise<unknown>;
  close(): Promise<unknown>;
};
