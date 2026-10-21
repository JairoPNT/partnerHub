import 'server-only';

import { createHash } from 'node:crypto';
import { lstat, open, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyMetaPixelToHtml } from '@/server/services/metaPixelHtml';
import { APPROVED_BUSINESS_MEASUREMENT_ARTIFACTS, type BusinessMeasurementArtifact } from '@/server/services/businessMeasurementArtifacts';

export type PreparedBusinessMeasurement = {
  artifactVersion: 1;
  indexHtml: string;
  appJs: Buffer;
  runtimeJs: Buffer;
  stylesCss: Buffer;
  providers: { ga4: boolean; meta: boolean };
};

const invalid = () => new Error('BUSINESS_MEASUREMENT_TEMPLATE_INVALID');
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const assets = ['index.html', 'app.js', 'measurement-runtime.js', 'styles.css'] as const;
const sameFile = (a: Awaited<ReturnType<typeof lstat>>, b: Awaited<ReturnType<typeof lstat>>) =>
  a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

// Approval ignores only cache-version attribute values on these exact assets.
// In particular, added query parameters, URLs, script bodies and other bytes
// are not removed or canonicalized to make an unreviewed template pass.
function assetTags(html: string) {
  const tags: { start: number; end: number; name: string; text: string }[] = [];
  // Skip comments and raw-text elements: markup-looking strings in JavaScript,
  // CSS or noscript are not asset attributes and must remain hashed verbatim.
  const pattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][a-z0-9:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    if (!match[1] || match[0].startsWith('</')) continue;
    const name = match[1].toLowerCase();
    if (name === 'script' || name === 'link') tags.push({ start: match.index, end: pattern.lastIndex, name, text: match[0] });
    if (name === 'plaintext') break;
    if (['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript'].includes(name)) {
      const closing = new RegExp(`</${name}\\s*>`, 'gi'); closing.lastIndex = pattern.lastIndex;
      const end = closing.exec(html);
      if (!end) throw invalid();
      pattern.lastIndex = closing.lastIndex;
    }
  }
  return tags;
}

function rewriteAssetVersions(html: string, version: string | null) {
  let result = html;
  for (const tag of assetTags(html).reverse()) {
    const attribute = tag.name === 'script' ? 'src' : 'href';
    let rewritten = tag.text;
    for (const attr of tagAttributes(tag.text).reverse()) {
      if (attr.name !== attribute || !attr.value || !/^(?:config\.js|app\.js|styles\.css|measurement-runtime\.js)(?:\?v=[a-z0-9._~-]*)?$/.test(attr.value)) continue;
      const name = attr.value.split('?')[0];
      rewritten = rewritten.slice(0, attr.valueStart) + name + (version === null ? '' : `?v=${version}`) + rewritten.slice(attr.valueStart + attr.value.length);
    }
    result = result.slice(0, tag.start) + rewritten + result.slice(tag.end);
  }
  return result;
}

function tagAttributes(tag: string) {
  const pattern = /\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  return [...tag.matchAll(pattern)].map(match => {
    const value = match[2] ?? match[3] ?? match[4];
    const quoted = match[2] !== undefined || match[3] !== undefined;
    return { name: match[1].toLowerCase(), value, valueStart: value === undefined ? -1 : match.index! + match[0].length - value.length - (quoted ? 1 : 0) };
  });
}

export function versionBusinessMeasurementHtml(html: string, assetVersion: string) {
  if (!/^[a-z0-9]+$/.test(assetVersion)) throw invalid();
  return rewriteAssetVersions(html, assetVersion);
}

function validateScriptOrder(html: string) {
  const scripts = assetTags(html).filter(tag => tag.name === 'script');
  const positions = ['config.js', 'measurement-runtime.js', 'app.js'].map(asset => {
    const matches = scripts.filter(match => {
      const src = tagAttributes(match.text).filter(attr => attr.name === 'src');
      return src.length === 1 && src[0].value === asset;
    });
    if (matches.length !== 1 || tagAttributes(matches[0].text).some(attr => ['async', 'defer'].includes(attr.name) || (attr.name === 'type' && attr.value !== 'text/javascript'))) throw invalid();
    return matches[0].start;
  });
  if (!(positions[0] < positions[1] && positions[1] < positions[2])) throw invalid();
}

export function createBusinessMeasurementPreparer({ approvedArtifacts }: { approvedArtifacts: readonly BusinessMeasurementArtifact[] }) {
  // Own the approval snapshot; neither requests nor later caller mutations can
  // promote release flags while preparation is reading the filesystem.
  const approvals = approvedArtifacts.map(artifact => ({ ...artifact, providers: { ...artifact.providers } }));
  return {
    async prepare(templateDirectory: string): Promise<PreparedBusinessMeasurement> {
      let captured: Buffer[];
      try {
        const directory = resolve(templateDirectory);
        const directoryStat = await lstat(directory);
        if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || await realpath(directory) !== directory) throw invalid();
        captured = await Promise.all(assets.map(async asset => {
          const path = resolve(directory, asset);
          const before = await lstat(path);
          if (!before.isFile() || before.isSymbolicLink() || await realpath(path) !== path) throw invalid();
          const handle = await open(path, 'r');
          try {
            const opened = await handle.stat();
            if (!opened.isFile() || !sameFile(before, opened)) throw invalid();
            const bytes = await handle.readFile();
            if (!sameFile(opened, await handle.stat()) || !sameFile(before, await lstat(path)) || await realpath(path) !== path) throw invalid();
            return bytes;
          } finally { await handle.close(); }
        }));
        if (!sameFile(directoryStat, await lstat(directory)) || await realpath(directory) !== directory) throw invalid();
      } catch { throw invalid(); }

      const [index, appJs, runtimeJs, stylesCss] = captured;
      let indexHtml: string;
      try { indexHtml = applyMetaPixelToHtml(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(index)); }
      catch { throw invalid(); }
      const normalized = rewriteAssetVersions(indexHtml, null);
      validateScriptOrder(normalized);
      const hashes = [sha(normalized), sha(appJs), sha(runtimeJs), sha(stylesCss)];
      const approved = approvals.find(artifact => artifact.version === 1
        && [artifact.indexHtmlSha256, artifact.appJsSha256, artifact.runtimeSha256, artifact.stylesSha256].every((hash, i) => /^[a-f0-9]{64}$/.test(hash) && hash === hashes[i])
        && typeof artifact.providers.ga4 === 'boolean' && typeof artifact.providers.meta === 'boolean');
      if (!approved) throw new Error('BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED');
      return { artifactVersion: 1, indexHtml, appJs, runtimeJs, stylesCss, providers: { ...approved.providers } };
    }
  };
}

// Server-owned dependency. No generation option, schema or ENV approval bypass.
export const businessMeasurementPreparer = createBusinessMeasurementPreparer({ approvedArtifacts: APPROVED_BUSINESS_MEASUREMENT_ARTIFACTS });
