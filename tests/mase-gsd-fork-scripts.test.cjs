'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const repoRoot = path.join(__dirname, '..');
const inventoryScript = path.join(repoRoot, 'scripts', 'mase-gsd-install-inventory.sh');
const propagateScript = path.join(repoRoot, 'scripts', 'mase-gsd-propagate.sh');
const installScript = path.join(repoRoot, 'scripts', 'mase-install-fork.sh');

function run(script, args, opts = {}) {
  return cp.execFileSync(script, args, {
    cwd: opts.cwd || repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function currentForkCommit() {
  return cp.execFileSync('git', ['-C', repoRoot, 'rev-parse', 'refs/heads/mase/local-fixes'], {
    encoding: 'utf8',
  }).trim();
}

function writeInstall(base, name, marker) {
  const target = path.join(base, name);
  const configDir = path.join(target, '.codex');
  fs.mkdirSync(path.join(configDir, 'get-shit-done'), { recursive: true });
  fs.writeFileSync(path.join(configDir, 'get-shit-done', 'VERSION'), '1.0.0\n');
  if (marker) {
    fs.writeFileSync(path.join(configDir, 'mase-fork-install.json'), JSON.stringify({
      schema_version: 1,
      source: 'mase-fork',
      fork_path: repoRoot,
      branch: 'mase/local-fixes',
      commit: marker.commit,
      runtime: 'codex',
      scope: 'local',
      target_path: target,
      config_dir: configDir,
      mode: marker.mode || 'full',
      installed_at: '2026-05-05T00:00:00Z',
      installer: 'scripts/mase-install-fork.sh',
    }, null, 2) + '\n');
  }
  return { target, configDir };
}

describe('Mase GSD fork install inventory', () => {
  test('classifies current, stale, and unknown installs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-inventory-'));
    const head = currentForkCommit();
    writeInstall(tmp, 'current-repo', { commit: head, mode: 'full' });
    writeInstall(tmp, 'stale-repo', { commit: '0000000000000000000000000000000000000000', mode: 'minimal' });
    writeInstall(tmp, 'unknown-repo', null);

    const parsed = JSON.parse(run(inventoryScript, ['--root', tmp, '--runtime', 'codex', '--json']));
    const byName = new Map(parsed.installs.map((row) => [path.basename(row.target_path), row]));

    assert.equal(byName.get('current-repo').status, 'current');
    assert.equal(byName.get('stale-repo').status, 'stale');
    assert.equal(byName.get('stale-repo').mode, 'minimal');
    assert.equal(byName.get('unknown-repo').status, 'unknown');
    assert.equal(byName.get('unknown-repo').source, 'unknown');
  });

  test('classifies marker without payload as broken', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-broken-'));
    const target = path.join(tmp, 'broken-repo');
    const configDir = path.join(target, '.codex');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'mase-fork-install.json'), JSON.stringify({
      source: 'mase-fork',
      fork_path: repoRoot,
      commit: currentForkCommit(),
      runtime: 'codex',
      scope: 'local',
      target_path: target,
      mode: 'full',
    }) + '\n');

    const parsed = JSON.parse(run(inventoryScript, ['--root', tmp, '--runtime', 'codex', '--json']));
    assert.equal(parsed.installs.length, 1);
    assert.equal(parsed.installs[0].status, 'broken');
  });
});

describe('Mase GSD fork propagation', () => {
  test('dry-run selects stale installs and preserves minimal flag', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-propagate-'));
    const markerPath = path.join(writeInstall(tmp, 'stale-repo', {
      commit: '0000000000000000000000000000000000000000',
      mode: 'minimal',
    }).configDir, 'mase-fork-install.json');
    const before = fs.readFileSync(markerPath, 'utf8');

    const output = run(propagateScript, ['--root', tmp, '--runtime', 'codex', '--dry-run']);

    assert.match(output, /would_update/);
    assert.match(output, /--minimal/);
    assert.equal(fs.readFileSync(markerPath, 'utf8'), before);
  });

  test('wrapper rejects missing local target before installing', () => {
    assert.throws(
      () => run(installScript, ['--runtime', 'codex', '--local']),
      /Local fork installs require --target PATH/
    );
  });

  test('dry-run works with default roots', () => {
    const output = run(propagateScript, ['--runtime', 'codex', '--dry-run']);

    assert.match(output, /^Mode: dry-run/m);
  });
});

describe('Mase GSD fork update guard', () => {
  test('update command has a fork marker preflight before upstream workflow', () => {
    const updateCommand = fs.readFileSync(path.join(repoRoot, 'commands', 'gsd', 'update.md'), 'utf8');

    assert.match(updateCommand, /Mase Fork Install Preflight/);
    assert.match(updateCommand, /mase-fork-install\.json/);
    assert.match(updateCommand, /GSD_ALLOW_UPSTREAM_UPDATE/);
    assert.match(updateCommand, /Do not update it from upstream npm/);
  });
});
