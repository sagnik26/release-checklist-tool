export const STEP_DEFINITIONS = [
  { key: "merged_prs", label: "All relevant GitHub pull requests have been merged" },
  { key: "changelog_updated", label: "CHANGELOG.md files have been updated" },
  { key: "tests_passing", label: "All tests are passing" },
  { key: "github_release_created", label: "Releases in Github created" },
  { key: "deployed_demo", label: "Deployed in demo" },
  { key: "tested_demo", label: "Tested thoroughly in demo" },
  { key: "deployed_production", label: "Deployed in production" },
] as const;

export type StepKey = (typeof STEP_DEFINITIONS)[number]["key"];

const labels = new Map<string, string>(STEP_DEFINITIONS.map((step) => [step.key, step.label]));

export function stepLabel(key: string): string {
  return labels.get(key) ?? "A step";
}
