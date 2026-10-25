export function confirmDelete(name: string): boolean {
  return window.confirm(`Delete "${name}"? This removes the release and its checklist.`);
}
