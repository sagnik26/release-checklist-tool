import { stepLabel } from "./steps";

export type RemoteChange = {
  kind: string;
  stepKey?: string | null;
  completed?: boolean | null;
};

export type ChangeNotice = {
  count: number;
  message: string;
};

export function isOwnChange(sourceClientId: string, clientId: string): boolean {
  return sourceClientId === clientId;
}

export function nextNotice(current: ChangeNotice | null, event: RemoteChange): ChangeNotice {
  const count = (current?.count ?? 0) + 1;
  if (count > 1) {
    return { count, message: `${count} changes from another tab` };
  }
  if (event.kind === "NOTES_CHANGED") {
    return { count, message: "Notes were updated in another tab" };
  }
  const verb = event.completed ? "checked" : "unchecked";
  return {
    count,
    message: `Checkbox "${stepLabel(event.stepKey ?? "")}" was ${verb} in another tab`,
  };
}
