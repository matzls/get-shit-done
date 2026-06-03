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
const agentsRoutingScript = path.join(repoRoot, 'scripts', 'mase-gsd-agents-routing.cjs');

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
      package_name: '@opengsd/gsd-core',
      bin_name: 'gsd-core',
      runtime: 'codex',
      scope: 'local',
      target_path: target,
      config_dir: configDir,
      mode: marker.mode || 'full',
      profile: marker.profile || (marker.mode === 'minimal' ? 'mase-minimal' : 'full'),
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
    assert.equal(byName.get('stale-repo').package_name, '@opengsd/gsd-core');
    assert.equal(byName.get('stale-repo').bin_name, 'gsd-core');
    assert.equal(byName.get('unknown-repo').status, 'unknown');
    assert.equal(byName.get('unknown-repo').source, 'unknown');
  });

  test('recognizes legacy fork marker shape during identity migration', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-legacy-marker-'));
    const target = path.join(tmp, 'legacy-repo');
    const configDir = path.join(target, '.codex');
    fs.mkdirSync(path.join(configDir, 'get-shit-done'), { recursive: true });
    fs.writeFileSync(path.join(configDir, 'get-shit-done', 'VERSION'), '1.0.0\n');
    fs.writeFileSync(path.join(configDir, 'mase-fork-install.json'), JSON.stringify({
      schema_version: 1,
      source: 'mase-fork',
      fork_path: repoRoot,
      branch: 'mase/local-fixes',
      commit: '0000000000000000000000000000000000000000',
      package: 'get-shit-done-cc',
      runtime: 'codex',
      scope: 'local',
      target_path: target,
      config_dir: configDir,
      mode: 'minimal',
      installed_at: '2026-05-05T00:00:00Z',
      installer: 'scripts/mase-install-fork.sh',
    }, null, 2) + '\n');

    const parsed = JSON.parse(run(inventoryScript, ['--root', tmp, '--runtime', 'codex', '--json']));
    assert.equal(parsed.installs.length, 1);
    assert.equal(parsed.installs[0].source, 'mase-fork');
    assert.equal(parsed.installs[0].status, 'stale');
    assert.equal(parsed.installs[0].package_name, 'get-shit-done-cc');
    assert.equal(parsed.installs[0].profile, 'legacy-minimal');
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

  test('reports target repo AGENTS.md routing status and evidence', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-routing-inventory-'));
    const { target } = writeInstall(tmp, 'current-repo', { commit: currentForkCommit(), mode: 'full' });

    run(process.execPath, [agentsRoutingScript, 'apply', '--target', target, '--json']);

    const parsed = JSON.parse(run(inventoryScript, ['--root', tmp, '--runtime', 'codex', '--json']));
    assert.equal(parsed.installs.length, 1);
    assert.equal(parsed.installs[0].agents_routing_status, 'current');
    assert.ok(parsed.installs[0].agents_routing_evidence.some((item) => item.startsWith('agents_exists:')));
    assert.ok(parsed.installs[0].agents_routing_data.template_sha256);
  });

  test('excludes managed OSS fork source checkout from local install targets', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-source-skip-'));
    const sourceRepo = path.join(tmp, 'get-shit-done');
    const configDir = path.join(sourceRepo, '.codex');
    fs.mkdirSync(path.join(configDir, 'skills', 'gsd-fork-propagate'), { recursive: true });
    fs.writeFileSync(path.join(configDir, 'skills', 'gsd-fork-propagate', 'SKILL.md'), '# Fork propagation\n');
    fs.writeFileSync(path.join(configDir, 'oss-fork-manager.json'), JSON.stringify({
      schema_version: 1,
      managed: true,
      fork_id: 'gsd',
      kind: 'oss-fork',
      adapter: 'gsd',
      registry: path.join(tmp, 'registry.json'),
      remotes: {},
      branches: {},
    }, null, 2) + '\n');

    const parsed = JSON.parse(run(inventoryScript, ['--root', tmp, '--runtime', 'codex', '--json']));

    assert.equal(parsed.installs.length, 0);
    assert.equal(parsed.skipped_source_checkouts.length, 1);
    assert.equal(parsed.skipped_source_checkouts[0].target_path, sourceRepo);
  });
});

describe('Mase GSD target AGENTS.md routing helper', () => {
  test('creates a managed routing block when AGENTS.md is missing', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-routing-create-'));
    const target = path.join(tmp, 'repo');
    fs.mkdirSync(target, { recursive: true });

    const result = JSON.parse(run(process.execPath, [agentsRoutingScript, 'apply', '--target', target, '--json']));
    const agents = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');

    assert.equal(result.status, 'current');
    assert.match(agents, /<!-- gsd-routing-start -->/);
    assert.match(agents, /## GSD Routing/);
    assert.match(agents, /gsd-map-codebase` then `gsd-new-project/);
    assert.match(agents, /Inspect workflow files under/);
    assert.match(agents, /gsd-fork-propagate/);
    assert.match(agents, /@opengsd\/gsd-core/);
    assert.doesNotMatch(agents, /get-shit-done-cc@latest/);
  });

  test('preserves existing instructions while appending the managed block', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-routing-preserve-'));
    const target = path.join(tmp, 'repo');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Existing Rules\n\nKeep this project-specific note.\n');

    run(process.execPath, [agentsRoutingScript, 'apply', '--target', target, '--json']);
    const agents = fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8');

    assert.match(agents, /Keep this project-specific note/);
    assert.match(agents, /<!-- gsd-routing-start -->/);
  });

  test('reports unmanaged GSD routing text as unknown instead of overwriting it during status', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-routing-unmanaged-'));
    const target = path.join(tmp, 'repo');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Existing Rules\n\nUse gsd-fork-propagate for framework updates.\n');

    const result = JSON.parse(run(process.execPath, [agentsRoutingScript, 'status', '--target', target, '--json']));

    assert.equal(result.status, 'unknown');
    assert.equal(result.data.finding, 'unmanaged_gsd_routing');
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

  test('dry-run preserves explicit upstream profile markers', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mase-gsd-propagate-profile-'));
    writeInstall(tmp, 'core-repo', {
      commit: '0000000000000000000000000000000000000000',
      mode: 'minimal',
      profile: 'core',
    });

    const output = run(propagateScript, ['--root', tmp, '--runtime', 'codex', '--dry-run']);

    assert.match(output, /--profile=core/);
    assert.doesNotMatch(output, /--minimal/);
  });

  test('wrapper records explicit named profiles in marker writer', () => {
    const script = fs.readFileSync(installScript, 'utf8');

    assert.match(script, /arg_value "--profile"/);
    assert.match(script, /profile="\$profile_arg"/);
    assert.match(script, /write_marker "\$runtime_config_dir" "\$mode" "\$profile"/);
  });

  test('wrapper rejects missing local target before installing', () => {
    assert.throws(
      () => run(installScript, ['--runtime', 'codex', '--local']),
      /Local fork installs require --target PATH/
    );
  });

  test('wrapper treats upstream-main as a protected mirror branch', () => {
    const script = fs.readFileSync(installScript, 'utf8');

    assert.match(script, /\$branch" = "main"/);
    assert.match(script, /\$branch" = "upstream-main"/);
    assert.match(script, /GSD_ALLOW_MIRROR_INSTALL/);
    assert.match(script, /clean upstream mirror/);
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
