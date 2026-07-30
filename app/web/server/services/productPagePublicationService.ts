import "server-only";

import { access, readdir } from "node:fs/promises";
import { basename, join, posix, relative, resolve, sep } from "node:path";

import SftpClient from "ssh2-sftp-client";
import { z } from "zod";

import { productPageSourceService } from "@/server/services/productPageSourceService";

const siteIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "siteId must be a lowercase slug");

export const productPagePublicationInputSchema = z.object({
  siteId: siteIdSchema
});

export type ProductPagePublicationInput = z.infer<typeof productPagePublicationInputSchema>;

export type ProductPagePublicationResult = {
  siteId: string;
  publishedAt: string;
  remoteRoot: string;
  files: string[];
};

type SftpConfiguration = {
  host: string;
  port: number;
  username: string;
  password: string;
  remoteRoot: string;
  remoteRoots: Record<string, string>;
  remoteRootTemplate?: string;
};

function getOutputRoot() {
  return process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites";
}

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required publication configuration: ${name}.`);
  }

  return value;
}

function getSftpConfiguration(): SftpConfiguration {
  const port = Number(requiredEnvironmentVariable("HOSTINGER_SFTP_PORT"));

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("HOSTINGER_SFTP_PORT must be a valid TCP port.");
  }

  const remoteRoot = posix.normalize(requiredEnvironmentVariable("HOSTINGER_SFTP_REMOTE_ROOT")).replace(/\/+$/, "");

  if (!remoteRoot.startsWith("/") || remoteRoot === "/") {
    throw new Error("HOSTINGER_SFTP_REMOTE_ROOT must be an absolute non-root path.");
  }

  let remoteRoots: Record<string, string> = {};
  const configuredRoots = process.env.HOSTINGER_SFTP_REMOTE_ROOTS_JSON?.trim();

  if (configuredRoots) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(configuredRoots);
    } catch {
      throw new Error("HOSTINGER_SFTP_REMOTE_ROOTS_JSON must contain valid JSON.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("HOSTINGER_SFTP_REMOTE_ROOTS_JSON must be a JSON object.");
    }

    remoteRoots = Object.fromEntries(
      Object.entries(parsed).map(([siteId, value]) => {
        if (typeof value !== "string" || !value.trim().startsWith("/")) {
          throw new Error(`Invalid remote root configured for siteId: ${siteId}.`);
        }
        return [siteId, posix.normalize(value.trim()).replace(/\/+$/, "")];
      })
    );
  }

  return {
    host: requiredEnvironmentVariable("HOSTINGER_SFTP_HOST"),
    port,
    username: requiredEnvironmentVariable("HOSTINGER_SFTP_USERNAME"),
    password: requiredEnvironmentVariable("HOSTINGER_SFTP_PASSWORD"),
    remoteRoot,
    remoteRoots,
    remoteRootTemplate: process.env.HOSTINGER_SFTP_REMOTE_ROOT_TEMPLATE?.trim() || undefined,
  };
}

async function getRemoteRoot(configuration: SftpConfiguration, siteId: string) {
  const mappedRoot = configuration.remoteRoots[siteId];
  if (mappedRoot) return mappedRoot;

  if (configuration.remoteRootTemplate) {
    const source = await productPageSourceService.get(siteId) as { site?: { domain?: unknown } } | null;
    const domain = typeof source?.site?.domain === "string" ? source.site.domain : null;

    if (domain) {
      return configuration.remoteRootTemplate.replaceAll("{domain}", domain);
    }

    throw new Error(`No publication domain is configured for siteId: ${siteId}.`);
  }

  if (Object.keys(configuration.remoteRoots).length > 0) {
    throw new Error(`No Hostinger remote root is configured for siteId: ${siteId}.`);
  }

  return mappedRoot ?? configuration.remoteRoot;
}

function resolveInsideDirectory(rootDirectory: string, childName: string) {
  const root = resolve(rootDirectory);
  const target = resolve(root, childName);

  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error("Publication package path escaped the configured output directory.");
  }

  return target;
}

function remotePathInsideRoot(remoteRoot: string, relativePath: string) {
  const target = posix.resolve(remoteRoot, relativePath.split(sep).join(posix.sep));

  if (!target.startsWith(`${remoteRoot}/`)) {
    throw new Error("Publication file path escaped the configured remote root.");
  }

  return target;
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listFiles(entryPath);
      }

      return entry.isFile() ? [entryPath] : [];
    })
  );

  return nestedFiles.flat();
}

async function ensureRemoteDirectory(sftp: SftpClient, remoteDirectory: string) {
  await sftp.mkdir(remoteDirectory, true);
}

async function replaceRemoteFile(sftp: SftpClient, temporaryRemoteFile: string, remoteFile: string) {
  const existingFile = await sftp.exists(remoteFile);
  const backupRemoteFile = `${remoteFile}.partnerhub-backup-${Date.now()}`;
  let backupCreated = false;

  if (existingFile) {
    await sftp.rename(remoteFile, backupRemoteFile);
    backupCreated = true;
  }

  try {
    await sftp.rename(temporaryRemoteFile, remoteFile);
  } catch (error) {
    if (backupCreated) {
      try {
        await sftp.rename(backupRemoteFile, remoteFile);
      } catch {
        // Preserve the original publish error; the backup remains available for recovery.
      }
    }

    throw error;
  }

  if (backupCreated) {
    await sftp.delete(backupRemoteFile);
  }
}

export const productPagePublicationService = {
  async publish(input: ProductPagePublicationInput): Promise<ProductPagePublicationResult> {
    const configuration = getSftpConfiguration();
    const localDirectory = resolveInsideDirectory(getOutputRoot(), input.siteId);
    const remoteRoot = await getRemoteRoot(configuration, input.siteId);

    try {
      await access(localDirectory);
    } catch {
      throw new Error(`No generated package exists for siteId: ${input.siteId}.`);
    }

    const localFiles = await listFiles(localDirectory);

    if (localFiles.length === 0) {
      throw new Error(`The generated package for siteId ${input.siteId} is empty.`);
    }

    const sftp = new SftpClient();
    const temporaryRemotePaths: string[] = [];
    let connected = false;

    try {
      await sftp.connect({
        host: configuration.host,
        port: configuration.port,
        username: configuration.username,
        password: configuration.password,
        readyTimeout: 15_000
      });
      connected = true;

      // Upload temporary files first. index.html is replaced last so visitors do not receive a partial page.
      const orderedFiles = [...localFiles].sort((left, right) => {
        const leftIsIndex = basename(left) === "index.html";
        const rightIsIndex = basename(right) === "index.html";
        return Number(leftIsIndex) - Number(rightIsIndex);
      });

      for (const localFile of orderedFiles) {
        const relativePath = relative(localDirectory, localFile);
        const remoteFile = remotePathInsideRoot(remoteRoot, relativePath);
        const remoteDirectory = posix.dirname(remoteFile);
        const temporaryRemoteFile = posix.join(
          remoteDirectory,
          `.${basename(remoteFile)}.partnerhub-upload-${Date.now()}`
        );

        await ensureRemoteDirectory(sftp, remoteDirectory);
        await sftp.put(localFile, temporaryRemoteFile);
        temporaryRemotePaths.push(temporaryRemoteFile);
        await replaceRemoteFile(sftp, temporaryRemoteFile, remoteFile);
      }
    } finally {
      await Promise.all(
        temporaryRemotePaths.map(async (temporaryRemoteFile) => {
          try {
            await sftp.delete(temporaryRemoteFile);
          } catch {
            // The file was usually renamed successfully; cleanup failures are non-fatal.
          }
        })
      );
      if (connected) {
        await sftp.end();
      }
    }

    return {
      siteId: input.siteId,
      publishedAt: new Date().toISOString(),
      remoteRoot,
      files: localFiles.map((localFile) => relative(localDirectory, localFile).split(sep).join("/"))
    };
  }
};
