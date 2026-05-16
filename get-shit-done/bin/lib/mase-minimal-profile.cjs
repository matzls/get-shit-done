'use strict';

/**
 * Mase-owned minimal install surface.
 *
 * This file is intentionally fork-local policy. Do not derive this list from
 * upstream `standard`; upstream may change its profile definitions, but Mase's
 * fork installs should keep this explicit surface until Mase changes it here.
 *
 * Policy: keep the global install small and workflow-derived. This profile is
 * the earlier curated minimal surface: main GSD loop, code-review checkpoint,
 * small-task ladder, help, update, and only the agents needed by that surface.
 */

const MASE_MINIMAL_PROFILE_NAME = 'mase-minimal';

const MASE_MINIMAL_SKILL_ALLOWLIST = Object.freeze([
  'code-review',
  'discuss-phase',
  'execute-phase',
  'fast',
  'help',
  'new-project',
  'plan-phase',
  'quick',
  'update',
]);

const MASE_MINIMAL_AGENT_ALLOWLIST = Object.freeze([
  'gsd-advisor-researcher',
  'gsd-assumptions-analyzer',
  'gsd-code-reviewer',
  'gsd-codebase-mapper',
  'gsd-executor',
  'gsd-pattern-mapper',
  'gsd-phase-researcher',
  'gsd-plan-checker',
  'gsd-planner',
  'gsd-project-researcher',
  'gsd-research-synthesizer',
  'gsd-roadmapper',
  'gsd-verifier',
]);

module.exports = {
  MASE_MINIMAL_PROFILE_NAME,
  MASE_MINIMAL_SKILL_ALLOWLIST,
  MASE_MINIMAL_AGENT_ALLOWLIST,
};
