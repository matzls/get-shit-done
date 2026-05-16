'use strict';
/**
 * Back-compat regression: --minimal still produces the same file set as before
 * the profile model was introduced (modulo the phase-inclusion fix).
 *
 * Also verifies --profile=core remains available separately from --minimal.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const {
  MASE_MINIMAL_PROFILE_NAME,
  MASE_MINIMAL_SKILL_ALLOWLIST,
  MINIMAL_SKILL_ALLOWLIST,
  PROFILES,
} = require('../get-shit-done/bin/lib/install-profiles.cjs');

const INSTALL_SCRIPT = path.join(__dirname, '..', 'bin', 'install.js');
const MANIFEST_NAME = 'gsd-file-manifest.json';

describe('install-minimal-backcompat: PROFILES.core matches MINIMAL_SKILL_ALLOWLIST', () => {
  test('PROFILES.core contains the same 7 skills as MINIMAL_SKILL_ALLOWLIST', () => {
    assert.deepStrictEqual(
      [...PROFILES.core].sort(),
      [...MINIMAL_SKILL_ALLOWLIST].sort(),
      'PROFILES.core must equal MINIMAL_SKILL_ALLOWLIST for back-compat',
    );
  });
});

describe('install-minimal-backcompat: --minimal uses Mase fork profile while --profile=core remains available', () => {
  function installAndGetManifest(extraArgs) {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-backcompat-'));
    try {
      spawnSync(
        process.execPath,
        [INSTALL_SCRIPT, '--claude', '--global', '--config-dir', targetDir, ...extraArgs],
        { encoding: 'utf8' },
      );
      const manifestPath = path.join(targetDir, MANIFEST_NAME);
      if (!fs.existsSync(manifestPath)) return { mode: null, profile: null, skillCount: 0, profileMarker: null };
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const skillCount = new Set(
        Object.keys(m.files || {})
          .filter((k) => k.startsWith('skills/'))
          .map((k) => k.split('/')[1]),
      ).size;
      // Read marker
      const markerPath = path.join(targetDir, '.gsd-profile');
      const profileMarker = fs.existsSync(markerPath)
        ? fs.readFileSync(markerPath, 'utf8').trim()
        : null;
      return { mode: m.mode, profile: m.profile, skillCount, profileMarker };
    } finally {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  test('--minimal produces Mase minimal profile with the fork-owned skill surface', () => {
    const r = installAndGetManifest(['--minimal']);
    assert.strictEqual(r.mode, 'minimal');
    assert.strictEqual(r.profile, MASE_MINIMAL_PROFILE_NAME);
    assert.ok(
      r.skillCount >= MASE_MINIMAL_SKILL_ALLOWLIST.length,
      `Mase minimal should include at least the explicit fork skill surface, got ${r.skillCount}`,
    );
  });

  test('--minimal writes .gsd-profile marker with the Mase minimal profile', () => {
    const r = installAndGetManifest(['--minimal']);
    assert.strictEqual(
      r.profileMarker,
      MASE_MINIMAL_PROFILE_NAME,
      '--minimal should write the fork-owned profile marker',
    );
  });

  test('default (no flags) writes .gsd-profile marker with "full"', () => {
    const r = installAndGetManifest([]);
    assert.strictEqual(r.profileMarker, 'full', 'default install should write profile marker "full"');
  });

  test('--profile=core writes .gsd-profile marker with "core"', () => {
    const r = installAndGetManifest(['--profile=core']);
    assert.strictEqual(r.profileMarker, 'core', '--profile=core should write profile marker "core"');
  });

  test('--profile=standard writes .gsd-profile marker with "standard"', () => {
    const r = installAndGetManifest(['--profile=standard']);
    assert.strictEqual(r.profileMarker, 'standard', '--profile=standard should write profile marker "standard"');
  });
});
