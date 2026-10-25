export function formatDueDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function statusLabel(status: string): string {
  if (status === "ONGOING") {
    return "Ongoing";
  }
  if (status === "DONE") {
    return "Done";
  }
  return "Planned";
}
