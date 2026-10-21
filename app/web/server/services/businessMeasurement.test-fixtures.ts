import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TestContext } from 'node:test';
import { businessMeasurementPreparer, createBusinessMeasurementPreparer } from '@/server/services/businessMeasurementHtml';

// Owned test bytes only. Never copy these approvals into the production registry.
const bytes = {
  'index.html': '<html><head><link href="styles.css" rel="stylesheet"></head><body><script src="config.js"></script><script src="measurement-runtime.js"></script><script src="app.js"></script></body></html>',
  'app.js': 'window.fixtureApp = true;',
  'measurement-runtime.js': 'window.fixtureRuntime = true;',
  'styles.css': 'body{}'
};
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

export async function prepareBusinessMeasurementFixture(t: TestContext, directory: string) {
  for (const [name, value] of Object.entries(bytes)) await writeFile(resolve(directory, name), value);
  t.mock.method(businessMeasurementPreparer, 'prepare', createBusinessMeasurementPreparer({ approvedArtifacts: [{
    version: 1,
    indexHtmlSha256: sha(bytes['index.html']), appJsSha256: sha(bytes['app.js']),
    runtimeSha256: sha(bytes['measurement-runtime.js']), stylesSha256: sha(bytes['styles.css']),
    providers: { ga4: false, meta: false }
  }] }).prepare);
}
