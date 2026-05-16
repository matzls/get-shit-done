'use strict';

/**
 * Mase-owned minimal install surface.
 *
 * This file is intentionally fork-local policy. Do not derive this list from
 * upstream `standard`; upstream may change its profile definitions, but Mase's
 * fork installs should keep this explicit surface until Mase changes it here.
 */

const MASE_MINIMAL_PROFILE_NAME = 'mase-minimal';

const MASE_MINIMAL_SKILL_ALLOWLIST = Object.freeze([
  'add-tests',
  'audit-milestone',
  'cleanup',
  'code-review',
  'complete-milestone',
  'config',
  'debug',
  'discuss-phase',
  'docs-update',
  'eval-review',
  'execute-phase',
  'extract-learnings',
  'forensics',
  'graphify',
  'health',
  'help',
  'import',
  'ingest-docs',
  'map-codebase',
  'new-milestone',
  'new-project',
  'pause-work',
  'phase',
  'plan-brief',
  'plan-phase',
  'progress',
  'quick',
  'resume-work',
  'review',
  'review-backlog',
  'secure-phase',
  'settings',
  'ship',
  'stats',
  'surface',
  'ui-review',
  'undo',
  'update',
  'validate-phase',
  'verify-work',
  'workspace',
  'workstreams',
]);

const MASE_MINIMAL_AGENT_ALLOWLIST = Object.freeze([
  'gsd-advisor-researcher',
  'gsd-assumptions-analyzer',
  'gsd-code-fixer',
  'gsd-code-reviewer',
  'gsd-codebase-mapper',
  'gsd-debug-session-manager',
  'gsd-debugger',
  'gsd-doc-classifier',
  'gsd-doc-synthesizer',
  'gsd-doc-verifier',
  'gsd-doc-writer',
  'gsd-eval-auditor',
  'gsd-executor',
  'gsd-integration-checker',
  'gsd-nyquist-auditor',
  'gsd-pattern-mapper',
  'gsd-phase-researcher',
  'gsd-plan-checker',
  'gsd-planner',
  'gsd-project-researcher',
  'gsd-research-synthesizer',
  'gsd-roadmapper',
  'gsd-security-auditor',
  'gsd-ui-auditor',
  'gsd-ui-checker',
  'gsd-ui-researcher',
  'gsd-verifier',
]);

module.exports = {
  MASE_MINIMAL_PROFILE_NAME,
  MASE_MINIMAL_SKILL_ALLOWLIST,
  MASE_MINIMAL_AGENT_ALLOWLIST,
};
