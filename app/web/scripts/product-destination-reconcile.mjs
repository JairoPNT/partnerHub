#!/usr/bin/env node
// CDX-20261020-022: metadata only. No provider clients or application getters.
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL, URL } from 'node:url';

const TICKET = 'CDX-20261020-022';
const VERSION = 'product-mutation-v1';
const HASH = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const APPROVED = Object.freeze({ 'blanca-ruiz': 'blancastella.pro', 'claudia-calero': 'claudiacalero.pro', 'dorian-higuita': 'dorianhiguita.pro', 'jairo-pinto-product': 'jairopinto.pro', 'lida-castaneda': 'lidacastaneda.pro', 'yenny-garcia': 'yennygarcia.pro' });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const normalizedDomain = (value) => typeof value === 'string' ? value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '') : null;
function fail(reason) { const error = new Error(`PRODUCT_RECONCILE_${reason}`); error.code = error.message; throw error; }
function requireThat(condition, reason) { if (!condition) fail(reason); }
function exact(value, keys) {
  requireThat(object(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'INVALID_MANIFEST');
}

// JSON.parse alone silently accepts duplicate keys and unsafe integer rounding.
function parse(bytes) {
  try {
    const text = bytes.toString('utf8'); let offset = 0;
    const whitespace = () => { while (/\s/.test(text[offset] ?? '') && offset < text.length) offset++; };
    function string() {
      const start = offset++;
      while (offset < text.length) {
        const character = text[offset++];
        if (character === '\\') offset++;
        else if (character === '"') return JSON.parse(text.slice(start, offset));
      }
      throw new Error();
    }
    function value(depth = 0) {
      if (depth > 80) throw new Error();
      whitespace();
      if (text[offset] === '"') return string();
      if (text[offset] === '{') {
        offset++; whitespace(); const keys = new Set();
        if (text[offset] === '}') { offset++; return; }
        while (true) {
          whitespace(); if (text[offset] !== '"') throw new Error();
          const key = string(); if (keys.has(key)) throw new Error(); keys.add(key);
          whitespace(); if (text[offset++] !== ':') throw new Error();
          value(depth + 1); whitespace(); const end = text[offset++];
          if (end === '}') return;
          if (end !== ',') throw new Error();
        }
      }
      if (text[offset] === '[') {
        offset++; whitespace(); if (text[offset] === ']') { offset++; return; }
        while (true) { value(depth + 1); whitespace(); const end = text[offset++]; if (end === ']') return; if (end !== ',') throw new Error(); }
      }
      const token = text.slice(offset).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/)?.[0];
      if (!token) throw new Error(); offset += token.length;
      if (/^-?\d/.test(token)) { const number = Number(token); if (!Number.isFinite(number) || (Number.isInteger(number) && !Number.isSafeInteger(number))) throw new Error(); }
    }
    value(); whitespace(); if (offset !== text.length) throw new Error();
    return JSON.parse(text);
  } catch { fail('INVALID_JSON'); }
}

async function stat(path) {
  try { return await fs.lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function safeParents(path) {
  const parent = dirname(path);
  if (parent !== path) await safeParents(parent);
  const info = await stat(path);
  if (info) requireThat(info.isDirectory() && !info.isSymbolicLink(), 'UNSAFE_DIRECTORY');
}
async function bytes(path, optional = false, limit = 16 * 1024 * 1024) {
  await safeParents(dirname(path));
  const before = await stat(path);
  if (!before && optional) return null;
  requireThat(before?.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= limit, 'UNSAFE_FILE');
  const handle = await fs.open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    requireThat(opened.ino === before.ino && opened.dev === before.dev && opened.nlink === 1 && opened.size === before.size, 'FILE_RACE');
    const result = await handle.readFile(); const after = await handle.stat();
    requireThat(result.length === before.size && after.mtimeMs === before.mtimeMs && after.size === before.size, 'FILE_RACE');
    return result;
  } finally { await handle.close(); }
}

function configuration(options) {
  const environment = options.environment ?? process.env;
  const defaultRoot = options.outputDirectory ?? '/data/generated-sites';
  const output = resolve(options.outputDirectory ?? environment.PRODUCT_PAGE_OUTPUT_DIR ?? '/data/generated-sites');
  const source = resolve(options.sourceDirectory ?? environment.PRODUCT_PAGE_SOURCE_DIR ?? join(defaultRoot, '.sources'));
  const jobs = resolve(options.jobDirectory ?? environment.PRODUCT_PAGE_PUBLICATION_JOB_DIR ?? join(defaultRoot, '.publication-jobs'));
  const activation = resolve(options.activationDirectory ?? environment.PRODUCT_PAGE_ACTIVATION_DIR ?? join(defaultRoot, '.activation'));
  const journals = resolve(environment.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR ?? join(defaultRoot, '.publication-journals'));
  const grants = resolve(environment.PRODUCT_PAGE_COMMERCIAL_GRANT_DIR ?? join(defaultRoot, '.commercial-grants'));
  const payments = resolve(environment.PRODUCT_PAGE_PAYMENT_DIR ?? join(defaultRoot, '.payments'));
  requireThat(source === join(output, '.sources') && jobs === join(output, '.publication-jobs') && activation === join(output, '.activation') && journals === join(output, '.publication-journals'), 'ROOT_CONFIG_MISMATCH');
  requireThat(grants === join(output, '.commercial-grants') && payments === join(output, '.payments'), 'ROOT_CONFIG_MISMATCH');
  requireThat(output !== dirname(output), 'ROOT_CONFIG_MISMATCH');
  return { output, source, jobs, activation, journals, grants, payments, targets: join(source, '.publishing-targets'), audit: join(output, '.product-destination-reconcile') };
}

function validateManifest(manifest, now, allowExpiredReceipt = false) {
  exact(manifest, ['version', 'ticket', 'siteId', 'ownerKey', 'baseDomain', 'expectedSourceHash', 'expectedTargetState', 'evidence']);
  requireThat(manifest.version === 1 && manifest.ticket === TICKET && Object.hasOwn(APPROVED, manifest.siteId) && APPROVED[manifest.siteId] === manifest.baseDomain && UUID.test(manifest.ownerKey) && HASH.test(manifest.expectedSourceHash) && manifest.expectedTargetState === 'ABSENT', 'INVALID_MANIFEST');
  const e = manifest.evidence;
  exact(e, ['observedAt', 'evidenceSha256', 'provider', 'dns', 'https', 'rootRouting']);
  exact(e.provider, ['username', 'baseDomain', 'publicHost', 'remoteRoot']);
  exact(e.dns, ['publicHost', 'resolved']); exact(e.https, ['url', 'status']); exact(e.rootRouting, ['baseDomain', 'ecosystemType']);
  const publicHost = `producto.${manifest.baseDomain}`;
  const remoteRoot = `/home/u708491435/domains/${manifest.baseDomain}/public_html/producto`;
  const observed = Date.parse(e.observedAt);
  requireThat(typeof e.observedAt === 'string' && Number.isFinite(observed) && new Date(observed).toISOString() === e.observedAt && observed <= now.getTime() && (allowExpiredReceipt || now.getTime() - observed <= 30 * 60_000), 'EVIDENCE_STALE');
  requireThat(HASH.test(e.evidenceSha256) && e.provider.username === 'u708491435' && e.provider.baseDomain === manifest.baseDomain && e.provider.publicHost === publicHost && e.provider.remoteRoot === remoteRoot && e.dns.publicHost === publicHost && e.dns.resolved === true && e.https.url === `https://${publicHost}/` && e.https.status === 200 && e.rootRouting.baseDomain === manifest.baseDomain && e.rootRouting.ecosystemType === (manifest.siteId === 'claudia-calero' ? 'BUSINESS' : 'PRODUCT'), 'EVIDENCE_MISMATCH');
}

async function entries(directory) {
  await safeParents(directory);
  const info = await stat(directory); if (!info) return [];
  return (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

async function protectedSnapshot(paths, manifest) {
  const result = {}; let count = 0; let total = 0;
  const excluded = new Set([join(paths.source, `${manifest.siteId}.json`), join(paths.targets, `${manifest.siteId}.json`)]);
  async function walk(directory) {
    for (const entry of await entries(directory)) {
      const path = join(directory, entry.name); if (excluded.has(path)) continue;
      requireThat(++count <= 20000, 'INVENTORY_LIMIT');
      const key = path.slice(paths.output.length + 1).split(sep).join('/');
      if (entry.isDirectory()) { result[key] = 'DIRECTORY'; await walk(path); }
      else { const raw = await bytes(path, false, 256 * 1024 * 1024); total += raw.length; requireThat(total <= 1024 * 1024 * 1024, 'INVENTORY_LIMIT'); result[key] = sha(raw); }
    }
  }
  for (const directory of [paths.source, paths.activation, paths.jobs, paths.journals, paths.grants, paths.payments, join(paths.output, manifest.siteId)]) await walk(directory);
  return { hash: sha(JSON.stringify(result)), files: result };
}

async function checkIdentity(paths, m, source) {
  requireThat(object(source) && object(source.site) && source.site.id === m.siteId && (source.ecosystemType === undefined || source.ecosystemType === 'PRODUCT') && [m.baseDomain, `producto.${m.baseDomain}`].includes(source.site.domain), 'SOURCE_IDENTITY');
  requireThat(source.ownerKey === undefined || source.ownerKey === m.ownerKey, 'OWNER_MISMATCH');
  requireThat(source.site.ownerKey === undefined || source.site.ownerKey === m.ownerKey, 'OWNER_MISMATCH');
  const leads = parse(await bytes(join(paths.activation, 'leads.json')));
  requireThat(Array.isArray(leads) && leads.every(object), 'LEAD_IDENTITY');
  const ownerSiteId = m.siteId === 'jairo-pinto-product' ? 'jairo-pinto' : m.siteId;
  const related = leads.filter((lead) => lead.id === m.ownerKey || [m.siteId, ownerSiteId].includes(lead.siteId) || normalizedDomain(lead.onboardingData?.domain) === m.baseDomain);
  requireThat(related.length === 1 && related[0].id === m.ownerKey && [m.siteId, ownerSiteId].includes(related[0].siteId) && normalizedDomain(related[0].onboardingData?.domain) === m.baseDomain && related[0].recordState !== 'ARCHIVED', 'LEAD_IDENTITY');
  for (const entry of await entries(paths.source)) {
    if (entry.isDirectory()) continue;
    requireThat(entry.isFile() && /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(entry.name), 'SOURCE_INVENTORY_AMBIGUOUS');
    const candidate = parse(await bytes(join(paths.source, entry.name)));
    requireThat(object(candidate.site) && candidate.site.id === entry.name.slice(0, -5), 'SOURCE_INVENTORY_AMBIGUOUS');
    if (candidate.site.id !== m.siteId && (candidate.ecosystemType ?? 'PRODUCT') === 'PRODUCT') {
      requireThat(![m.baseDomain, `producto.${m.baseDomain}`].includes(candidate.site.domain) && candidate.ownerKey !== m.ownerKey && candidate.site.ownerKey !== m.ownerKey, 'SOURCE_COLLISION');
    }
  }
  for (const entry of await entries(paths.targets)) {
    if (entry.name === `${m.siteId}.json`) continue;
    requireThat(entry.isFile() && /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(entry.name), 'TARGET_INVENTORY_AMBIGUOUS');
    const candidate = parse(await bytes(join(paths.targets, entry.name)));
    requireThat(object(candidate) && [1, 2].includes(candidate.version) && candidate.siteId === entry.name.slice(0, -5) && UUID.test(candidate.ownerKey) && ['PRODUCT', 'BUSINESS', 'PERSONAL_BRAND'].includes(candidate.ecosystemType) && typeof candidate.publicHost === 'string' && typeof candidate.baseDomain === 'string' && (candidate.remoteRoot === null || typeof candidate.remoteRoot === 'string'), 'TARGET_INVENTORY_AMBIGUOUS');
    const remote = m.evidence.provider.remoteRoot;
    requireThat(candidate.publicHost !== `producto.${m.baseDomain}` && !(candidate.ownerKey === m.ownerKey && candidate.ecosystemType === 'PRODUCT'), 'TARGET_COLLISION');
    if (candidate.baseDomain === m.baseDomain) requireThat(candidate.ownerKey === m.ownerKey, 'TARGET_COLLISION');
    if (candidate.remoteRoot !== null) {
      requireThat(/^\/home\/[a-z0-9]+\/domains\/[a-z0-9.-]+\/public_html(?:\/[a-z0-9-]+)*$/.test(candidate.remoteRoot), 'TARGET_INVENTORY_AMBIGUOUS');
      requireThat(candidate.remoteRoot !== remote && !candidate.remoteRoot.startsWith(`${remote}/`) && !remote.startsWith(`${candidate.remoteRoot}/`), 'TARGET_ROOT_OVERLAP');
    }
  }
}

async function checkActivity(paths, siteId, claimed) {
  await safeParents(join(paths.output, '.product-mutation-claims'));
  if (!claimed) requireThat(!(await stat(join(paths.output, '.product-mutation-claims', sha(siteId)))), 'ACTIVE_CLAIM');
  for (const directory of [join(paths.jobs, '.claims'), join(paths.jobs, '.locks')]) requireThat((await entries(directory)).length === 0, 'ACTIVE_JOB_CLAIM');
  for (const entry of await entries(paths.jobs)) {
    if (entry.isDirectory() && ['.claims', '.locks'].includes(entry.name)) continue;
    requireThat(entry.isFile() && HASH.test(entry.name.replace(/\.json$/, '')) && entry.name.endsWith('.json'), 'JOB_INVENTORY_AMBIGUOUS');
    const job = parse(await bytes(join(paths.jobs, entry.name)));
    requireThat(object(job.intent) && typeof job.intent.siteId === 'string' && ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(job.status), 'JOB_INVENTORY_AMBIGUOUS');
    if (job.intent.siteId === siteId) requireThat(!['QUEUED', 'RUNNING'].includes(job.status) && job.lease === undefined, 'ACTIVE_JOB');
  }
}

async function plan(options, claimed = false) {
  const paths = configuration(options); const now = (options.now ?? (() => new Date()))();
  requireThat(typeof options.manifestPath === 'string', 'MANIFEST_REQUIRED');
  const manifestBytes = await bytes(resolve(options.manifestPath), false, 64 * 1024);
  const manifest = parse(manifestBytes); validateManifest(manifest, now, true);
  await safeParents(paths.output);
  requireThat((await stat(paths.targets))?.isDirectory(), 'TARGET_DIRECTORY_REQUIRED');
  const sourcePath = join(paths.source, `${manifest.siteId}.json`);
  const targetPath = join(paths.targets, `${manifest.siteId}.json`);
  const original = await bytes(sourcePath); const source = parse(original);
  const existing = await bytes(targetPath, true);
  const audit = join(paths.audit, manifest.siteId);
  if (await stat(audit)) {
    const complete = await bytes(join(audit, 'complete.json'), true);
    requireThat(complete, 'AUDIT_REQUIRES_REVIEW');
    const receipt = parse(complete);
    exact(receipt, ['version', 'ticket', 'state', 'plan', 'planHash']);
    requireThat(receipt.version === 1 && receipt.ticket === TICKET && receipt.state === 'COMPLETE' && object(receipt.plan) && sha(JSON.stringify(receipt.plan)) === receipt.planHash && receipt.plan.manifestHash === sha(manifestBytes) && receipt.plan.rootsHash === sha(JSON.stringify(paths)) && receipt.plan.siteId === manifest.siteId && receipt.plan.sourceBeforeHash === manifest.expectedSourceHash, 'RECEIPT_MISMATCH');
    const expectedEntries = ['source.before.json', 'source.after.json', 'target.after.json', 'intent.json', 'source-written.json', 'target-created.json', 'complete.json'];
    requireThat((await entries(audit)).map((entry) => entry.name).sort().join(',') === expectedEntries.sort().join(','), 'AUDIT_REQUIRES_REVIEW');
    requireThat((await bytes(join(audit, 'intent.json'))).equals(Buffer.from(json({ ...receipt, state: 'INTENT' }))) && (await bytes(join(audit, 'source-written.json'))).equals(Buffer.from(json({ state: 'SOURCE_WRITTEN', hash: receipt.plan.sourceAfterHash }))) && (await bytes(join(audit, 'target-created.json'))).equals(Buffer.from(json({ state: 'TARGET_CREATED', hash: receipt.plan.targetAfterHash }))), 'RECEIPT_MISMATCH');
    const backup = await bytes(join(audit, 'source.before.json'));
    requireThat(sha(backup) === manifest.expectedSourceHash && sha(await bytes(join(audit, 'source.after.json'))) === receipt.plan.sourceAfterHash && sha(await bytes(join(audit, 'target.after.json'))) === receipt.plan.targetAfterHash, 'RECEIPT_MISMATCH');
    requireThat(sha(original) === receipt.plan.sourceAfterHash && existing && sha(existing) === receipt.plan.targetAfterHash, 'RECEIPT_DRIFT');
    await checkIdentity(paths, manifest, source); await checkActivity(paths, manifest.siteId, claimed);
    requireThat((await protectedSnapshot(paths, manifest)).hash === receipt.plan.protectedStateHash, 'PROTECTED_DRIFT');
    return { plan: receipt.plan, planHash: receipt.planHash, paths, manifest, completed: true };
  }
  // Only a completely verified, zero-write replay above may outlive its evidence.
  validateManifest(manifest, now);
  requireThat(!existing, 'TARGET_EXISTS');
  requireThat(sha(original) === manifest.expectedSourceHash, 'SOURCE_DRIFT');
  await checkIdentity(paths, manifest, source); await checkActivity(paths, manifest.siteId, claimed);
  const protectedState = await protectedSnapshot(paths, manifest);
  const nextSource = Buffer.from(json({ ...source, site: { ...source.site, domain: `producto.${manifest.baseDomain}` } }));
  const timestamp = manifest.evidence.observedAt;
  const nextTarget = Buffer.from(json({ version: 2, ownerKey: manifest.ownerKey, siteId: manifest.siteId, ecosystemType: 'PRODUCT', rootEcosystemType: manifest.evidence.rootRouting.ecosystemType, baseDomain: manifest.baseDomain, publicHost: `producto.${manifest.baseDomain}`, remoteRoot: manifest.evidence.provider.remoteRoot, provisioningState: 'READY', hostingerState: 'READY', dnsState: 'RESOLVED', sslState: 'READY', publicationState: 'PENDING', lastCheckedAt: timestamp, createdAt: timestamp, updatedAt: timestamp }));
  const publicPlan = { ticket: TICKET, siteId: manifest.siteId, ownerKey: manifest.ownerKey, baseDomain: manifest.baseDomain, publicHost: `producto.${manifest.baseDomain}`, remoteRoot: manifest.evidence.provider.remoteRoot, publicationState: 'PENDING', rootEcosystemType: manifest.evidence.rootRouting.ecosystemType, manifestHash: sha(manifestBytes), sourceBeforeHash: sha(original), sourceAfterHash: sha(nextSource), targetBefore: 'ABSENT', targetAfterHash: sha(nextTarget), protectedStateHash: protectedState.hash, rootsHash: sha(JSON.stringify(paths)), coordinationVersion: VERSION };
  return { plan: publicPlan, planHash: sha(JSON.stringify(publicPlan)), paths, manifest, sourcePath, targetPath, original, nextSource, nextTarget, protectedState };
}

async function loadGate(options) {
  let module;
  try { module = options.coordinatorModule ?? await import(new URL('../runtime-assets/product-mutation-coordinator.mjs', import.meta.url)); }
  catch { fail('GATE_UNAVAILABLE'); }
  requireThat(module.PRODUCT_MUTATION_COORDINATION_VERSION === VERSION && typeof module.createProductMutationCoordinator === 'function', 'GATE_VERSION');
  return module.createProductMutationCoordinator({ outputDirectory: configuration(options).output });
}

async function syncDirectory(directory) {
  // Windows Node cannot open directory handles for fsync. Tests model that platform;
  // Linux production requires successful directory fsync, never a swallowed error.
  if (process.platform === 'win32') return;
  const handle = await fs.open(directory, constants.O_RDONLY | constants.O_DIRECTORY);
  try { await handle.sync(); } finally { await handle.close(); }
}

async function writeExclusive(path, content) {
  await safeParents(dirname(path));
  const handle = await fs.open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
  try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
  await syncDirectory(dirname(path));
}
const sameFile = (a, b) => a && b && a.dev === b.dev && a.ino === b.ino;

async function applyUnderClaim(options, state) {
  const { paths, manifest, sourcePath, targetPath, original, nextSource, nextTarget } = state;
  const audit = join(paths.audit, manifest.siteId);
  const claim = join(paths.output, '.product-mutation-claims', sha(manifest.siteId), 'owner.json');
  const claimIdentity = await stat(claim); const claimHash = sha(await bytes(claim));
  const assertOwned = async () => requireThat(sameFile(await stat(claim), claimIdentity) && sha(await bytes(claim)) === claimHash, 'CLAIM_LOST');
  await assertOwned(); await safeParents(paths.audit);
  await fs.mkdir(paths.audit, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') requireThat(((await stat(paths.audit)).mode & 0o077) === 0, 'UNSAFE_AUDIT_PERMISSIONS');
  await fs.mkdir(audit, { mode: 0o700 }); await syncDirectory(paths.audit);
  // Each durable file is create-only. Orphans remain blocked for explicit review.
  await writeExclusive(join(audit, 'source.before.json'), original);
  await writeExclusive(join(audit, 'source.after.json'), nextSource);
  await writeExclusive(join(audit, 'target.after.json'), nextTarget);
  const receipt = { version: 1, ticket: TICKET, state: 'INTENT', plan: state.plan, planHash: state.planHash };
  await writeExclusive(join(audit, 'intent.json'), json(receipt));
  let sourceOwned = null; let targetOwned = null;
  const checkpoint = async (phase) => { await assertOwned(); if (options.checkpoint) await options.checkpoint(phase); await assertOwned(); };
  async function replaceSource(content, expectedHash, expectedIdentity = null) {
    await assertOwned();
    const current = await bytes(sourcePath);
    requireThat(sha(current) === expectedHash && (!expectedIdentity || sameFile(await stat(sourcePath), expectedIdentity)), 'SOURCE_DRIFT');
    const temporary = `${sourcePath}.reconcile-${randomUUID()}`;
    await writeExclusive(temporary, content);
    // Repeat CAS immediately before rename while the shared writer gate is held.
    requireThat(sha(await bytes(sourcePath)) === expectedHash && (!expectedIdentity || sameFile(await stat(sourcePath), expectedIdentity)), 'SOURCE_DRIFT');
    await fs.rename(temporary, sourcePath);
    const owned = await stat(sourcePath);
    if (content === nextSource) sourceOwned = owned;
    await syncDirectory(dirname(sourcePath));
    return owned;
  }
  try {
    await checkpoint('intent');
    requireThat((await protectedSnapshot(paths, manifest)).hash === state.plan.protectedStateHash && sha(await bytes(sourcePath)) === state.plan.sourceBeforeHash && !(await stat(targetPath)), 'PREWRITE_DRIFT');
    sourceOwned = await replaceSource(nextSource, state.plan.sourceBeforeHash);
    await writeExclusive(join(audit, 'source-written.json'), json({ state: 'SOURCE_WRITTEN', hash: state.plan.sourceAfterHash }));
    await checkpoint('source');
    await safeParents(paths.targets);
    // Targets directory must already exist in the reviewed inventory. Creating it
    // would change the protected-state plan and is therefore not inferred here.
    requireThat((await stat(paths.targets))?.isDirectory(), 'TARGET_DIRECTORY_REQUIRED');
    const temporary = join(paths.targets, `.reconcile-${randomUUID()}`);
    await writeExclusive(temporary, nextTarget);
    // Hard-link publication is atomic and no-clobber, unlike rename over a foreign target.
    await fs.link(temporary, targetPath); targetOwned = await stat(targetPath);
    await fs.unlink(temporary); await syncDirectory(paths.targets);
    await writeExclusive(join(audit, 'target-created.json'), json({ state: 'TARGET_CREATED', hash: state.plan.targetAfterHash }));
    await checkpoint('target');
    requireThat(sha(await bytes(sourcePath)) === state.plan.sourceAfterHash && sameFile(await stat(sourcePath), sourceOwned) && sha(await bytes(targetPath)) === state.plan.targetAfterHash && sameFile(await stat(targetPath), targetOwned), 'READBACK_DRIFT');
    requireThat((await protectedSnapshot(paths, manifest)).hash === state.plan.protectedStateHash, 'PROTECTED_DRIFT');
    await checkpoint('readback');
    // Check again after observer callbacks; never mark drift as completed.
    requireThat(sha(await bytes(sourcePath)) === state.plan.sourceAfterHash && sha(await bytes(targetPath)) === state.plan.targetAfterHash && (await protectedSnapshot(paths, manifest)).hash === state.plan.protectedStateHash, 'READBACK_DRIFT');
    await writeExclusive(join(audit, 'complete.json'), json({ ...receipt, state: 'COMPLETE' }));
    return { outcome: 'APPLIED', planHash: state.planHash, siteId: manifest.siteId, publicationState: 'PENDING' };
  } catch {
    // A possibly committed completion record is never guessed away.
    if (await stat(join(audit, 'complete.json'))) fail('RECOVERY_REQUIRED');
    try {
      await assertOwned();
      if (targetOwned) {
        requireThat(sameFile(await stat(targetPath), targetOwned) && sha(await bytes(targetPath)) === state.plan.targetAfterHash, 'FOREIGN_DRIFT');
        await fs.unlink(targetPath); await syncDirectory(paths.targets);
      }
      if (sourceOwned) await replaceSource(original, state.plan.sourceAfterHash, sourceOwned);
      requireThat(sha(await bytes(sourcePath)) === state.plan.sourceBeforeHash && !(await stat(targetPath)), 'ROLLBACK_DRIFT');
      await writeExclusive(join(audit, 'rollback.json'), json({ version: 1, ticket: TICKET, state: 'ROLLED_BACK', planHash: state.planHash }));
    } catch {
      // No lock deletion, blind restore, resume, or recursive cleanup on uncertainty.
      fail('RECOVERY_REQUIRED');
    }
    fail('ROLLED_BACK');
  }
}

export async function runProductDestinationReconcile(options = {}) {
  const mode = options.mode ?? 'PREVIEW'; requireThat(['PREVIEW', 'APPLY'].includes(mode), 'INVALID_ARGUMENTS');
  if (mode === 'APPLY') requireThat(options.confirmation === 'RECONCILE_PRODUCT_DESTINATION' && HASH.test(options.expectedPlanHash), 'CONFIRMATION_REQUIRED');
  const state = await plan(options);
  if (mode === 'PREVIEW') return { outcome: state.completed ? 'ALREADY_APPLIED' : 'PREVIEW', plan: state.plan, planHash: state.planHash };
  requireThat(options.expectedPlanHash === state.planHash, 'PLAN_DRIFT');
  const withProductMutation = await loadGate(options);
  return withProductMutation(state.manifest.siteId, async () => {
    const current = await plan(options, true);
    requireThat(current.planHash === options.expectedPlanHash, 'PLAN_DRIFT');
    if (current.completed) return { outcome: 'ALREADY_APPLIED', siteId: current.manifest.siteId, planHash: current.planHash };
    return applyUnderClaim(options, current);
  });
}

async function main(argv) {
  const options = {}; const flags = { '--manifest': 'manifestPath', '--mode': 'mode', '--plan-hash': 'expectedPlanHash', '--confirm': 'confirmation' };
  for (let index = 0; index < argv.length; index += 2) {
    const key = flags[argv[index]];
    requireThat(key && argv[index + 1] && !argv[index + 1].startsWith('--') && !Object.hasOwn(options, key), 'INVALID_ARGUMENTS');
    options[key] = argv[index + 1];
  }
  return runProductDestinationReconcile(options);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then((result) => process.stdout.write(json(result)), (error) => {
    const code = /^(?:PRODUCT_RECONCILE_|PRODUCT_MUTATION_)[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'PRODUCT_RECONCILE_IO_BLOCKED';
    process.stdout.write(json({ outcome: 'BLOCKED', code })); process.exitCode = 1;
  });
}
