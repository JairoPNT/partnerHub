import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const SftpClient = require("ssh2-sftp-client");
const client = new SftpClient();

if (typeof client.connect !== "function" || typeof client.end !== "function") {
  throw new Error("SFTP_RUNTIME_INVALID");
}

process.stdout.write('{"status":"SFTP_RUNTIME_READY","providerCallsMade":false}\n');
