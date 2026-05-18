/**
 * Regression test for bug #3357.
 *
 * Older Codex installs carried legacy GSD SessionStart commands in hooks.json.
 * Mase's fork still registers the managed Codex SessionStart hook in
 * hooks.json, but reinstall must converge to exactly one current managed entry
 * while preserving user-owned entries.
 */

'use strict';

process.env.GSD_TEST_MODE = '1';

const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const installModule = require('../bin/install.js');
const { readInstallState, writeInstallState } = require('../get-shit-done/bin/lib/installer-migrations.cjs');
const { install, parseTomlToObject } = installModule;
const { createTempDir, cleanup } = require('./helpers.cjs');
const HOOKS_DIST = path.join(__dirname, '..', 'hooks', 'dist');
const BUILD_HOOKS_SCRIPT = path.join(__dirname, '..', 'scripts', 'build-hooks.js');

function withCodexHome(codexHome, fn) {
  const previousCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    return fn();
  } finally {
    if (previousCodexHome == null) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
  }
}

function legacyGsdHook(codexHome) {
  return {
    hooks: [{
      type: 'command',
      command: `node "${path.join(codexHome, 'hooks', 'gsd-check-update.js')}"`,
    }],
  };
}

function userHook() {
  return {
    hooks: [{
      type: 'command',
      command: 'node "/Users/example/bin/user-hook.js"',
    }],
  };
}

function hooksJsonCommands(codexHome) {
  const hooksPath = path.join(codexHome, 'hooks.json');
  if (!fs.existsSync(hooksPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  const sessionStart = parsed.SessionStart ?? parsed.hooks?.SessionStart ?? [];
  return sessionStart
    .flatMap((entry) => Array.isArray(entry.hooks) ? entry.hooks : [])
    .map((hook) => hook.command)
    .filter((command) => typeof command === 'string');
}

function hooksJsonGsdHookCount(codexHome) {
  return hooksJsonCommands(codexHome)
    .filter((command) => command.includes(`${codexHome}/hooks/gsd-check-update.js`))
    .length;
}

function tomlGsdHookCount(codexHome) {
  const parsed = parseTomlToObject(fs.readFileSync(path.join(codexHome, 'config.toml'), 'utf8'));
  const sessionStart = parsed.hooks?.SessionStart ?? [];
  return sessionStart
    .flatMap((entry) => Array.isArray(entry.hooks) ? entry.hooks : [])
    .filter((hook) => typeof hook.command === 'string' && hook.command.includes('gsd-check-update.js'))
    .length;
}

describe('#3357 — Codex install removes legacy GSD hooks.json entries', { concurrency: false }, () => {
  let tmpRoot;
  let codexHome;

  beforeEach(() => {
    if (!fs.existsSync(HOOKS_DIST) || fs.readdirSync(HOOKS_DIST).length === 0) {
      execFileSync(process.execPath, [BUILD_HOOKS_SCRIPT], { stdio: 'pipe' });
    }
    tmpRoot = createTempDir('gsd-3357-');
    codexHome = path.join(tmpRoot, '.codex');
    fs.mkdirSync(codexHome, { recursive: true });
  });

  afterEach(() => {
    delete installModule.__codexSchemaValidator;
    cleanup(tmpRoot);
  });

  test('creates exactly one managed hooks.json entry on clean Codex install', () => {
    withCodexHome(codexHome, () => install(true, 'codex'));

    assert.equal(hooksJsonGsdHookCount(codexHome), 1);
    assert.equal(tomlGsdHookCount(codexHome), 0);
  });

  test('preserves user-only hooks.json while adding one managed GSD entry', () => {
    fs.writeFileSync(
      path.join(codexHome, 'hooks.json'),
      JSON.stringify({ SessionStart: [userHook()] }, null, 2),
    );

    withCodexHome(codexHome, () => install(true, 'codex'));

    const commands = hooksJsonCommands(codexHome);
    assert.equal(commands.includes('node "/Users/example/bin/user-hook.js"'), true);
    assert.equal(hooksJsonGsdHookCount(codexHome), 1);
    assert.equal(tomlGsdHookCount(codexHome), 0);
  });

  test('replaces a legacy managed-only hooks.json entry with one current managed entry', () => {
    fs.writeFileSync(
      path.join(codexHome, 'hooks.json'),
      JSON.stringify({ SessionStart: [legacyGsdHook(codexHome)] }, null, 2),
    );

    withCodexHome(codexHome, () => install(true, 'codex'));

    assert.equal(hooksJsonGsdHookCount(codexHome), 1);
    assert.equal(tomlGsdHookCount(codexHome), 0);
  });

  test('replaces a reintroduced legacy hooks.json entry even when migration was already applied', () => {
    writeInstallState(codexHome, {
      schemaVersion: 1,
      appliedMigrations: [
        {
          id: '2026-05-11-codex-legacy-hooks-json',
          title: 'Remove legacy Codex hooks.json GSD hook registrations',
          appliedAt: '2026-05-18T00:00:00.000Z',
        },
      ],
    });
    fs.writeFileSync(
      path.join(codexHome, 'hooks.json'),
      JSON.stringify({ SessionStart: [legacyGsdHook(codexHome)] }, null, 2),
    );

    withCodexHome(codexHome, () => install(true, 'codex'));

    assert.equal(hooksJsonGsdHookCount(codexHome), 1);
    assert.equal(tomlGsdHookCount(codexHome), 0);
  });

  test('preserves user hooks.json entries while replacing the legacy GSD hook', () => {
    const userOwnedSameBasenameHook = {
      hooks: [{
        type: 'command',
        command: 'node "/Users/example/bin/gsd-check-update.js"',
      }],
    };
    fs.writeFileSync(
      path.join(codexHome, 'hooks.json'),
      JSON.stringify({ SessionStart: [legacyGsdHook(codexHome), userHook(), userOwnedSameBasenameHook] }, null, 2),
    );

    withCodexHome(codexHome, () => install(true, 'codex'));

    const commands = hooksJsonCommands(codexHome);
    assert.equal(commands.includes('node "/Users/example/bin/user-hook.js"'), true);
    assert.equal(commands.includes('node "/Users/example/bin/gsd-check-update.js"'), true);
    assert.equal(hooksJsonGsdHookCount(codexHome), 1);
    assert.equal(tomlGsdHookCount(codexHome), 0);
  });

  test('restores migrated hooks.json and install state when later Codex validation fails', () => {
    const before = JSON.stringify({ SessionStart: [legacyGsdHook(codexHome)] }, null, 2);
    fs.writeFileSync(path.join(codexHome, 'hooks.json'), before);

    installModule.__codexSchemaValidator = () => ({
      ok: false,
      reason: 'forced migration rollback test',
    });

    assert.throws(
      () => withCodexHome(codexHome, () => install(true, 'codex')),
      /forced migration rollback test/
    );

    assert.equal(fs.readFileSync(path.join(codexHome, 'hooks.json'), 'utf8'), before);
    assert.equal(
      readInstallState(codexHome).appliedMigrations.some((entry) => entry.id === '2026-05-11-codex-legacy-hooks-json'),
      false
    );
  });
});
