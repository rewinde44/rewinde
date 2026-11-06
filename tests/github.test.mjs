import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { prepareGithub, sourceFiles } from '../scripts/prepare-github.mjs';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'rewinde-package-'));
  assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + sep));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, 'source'), destination = join(directory, 'upload');
  for (const name of sourceFiles) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), 'Source: ' + name);
  }
  return { root, destination };
}

test('GitHub-Paket enthält Quellcode und Punktdateien, aber keine privaten Daten oder Historie', async t => {
  const { root, destination } = await fixture(t);
  for (const name of ['data/workspace.json', 'outputs/export.json', '.env', '.git/config', 'dist/private.html', 'private.txt']) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), 'PRIVATE TEST CONTENT');
  }
  await prepareGithub(destination, root);
  const entries = await readdir(destination, { recursive: true });
  assert.ok(entries.includes('.gitignore'));
  assert.equal(await readFile(join(destination, '.github/workflows/ci.yml'), 'utf8'), 'Source: .github/workflows/ci.yml');
  for (const name of ['data', 'outputs', '.env', '.git', 'dist', 'private.txt']) assert.ok(!entries.includes(name), name);
  assert.equal(await readFile(join(destination, 'public/app.js'), 'utf8'), 'Source: public/app.js');
});

test('GitHub-Paket verweigert unbekannte Zieldateien, ohne diese zu löschen oder Quellen zu überschreiben', async t => {
  const { root, destination } = await fixture(t);
  await prepareGithub(destination, root);
  await writeFile(join(destination, 'private.json'), 'Keep me');
  await writeFile(join(root, 'README.md'), 'Updated');
  await assert.rejects(prepareGithub(destination, root), /Zusätzliche Dateien/);
  assert.equal(await readFile(join(destination, 'private.json'), 'utf8'), 'Keep me');
  assert.equal(await readFile(join(destination, 'README.md'), 'utf8'), 'Source: README.md');
});

test('GitHub-Paket aktualisiert bekannte Dateien und bleibt erneut baubar', async t => {
  const { root, destination } = await fixture(t);
  await prepareGithub(destination, root);
  await writeFile(join(root, 'README.md'), 'Updated');
  await prepareGithub(destination, root);
  assert.equal(await readFile(join(destination, 'README.md'), 'utf8'), 'Updated');
});
