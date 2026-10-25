import { badUserInput } from "../exceptions/graphql.exception.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ValidationPipe {
  name(name: string): string {
    if (typeof name !== "string") {
      throw badUserInput("name");
    }
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw badUserInput("name", "Enter a name between 1 and 100 characters.");
    }
    return trimmed;
  }

  dueDate(dueDate: string): string {
    if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw badUserInput("dueDate", "Enter a real date as YYYY-MM-DD.");
    }
    const [yearText, monthText, dayText] = dueDate.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isReal =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    if (!isReal) {
      throw badUserInput("dueDate", "Enter a real date as YYYY-MM-DD.");
    }
    return dueDate;
  }

  notes(notes: string | null | undefined): string | null {
    if (notes == null) {
      return null;
    }
    if (typeof notes !== "string") {
      throw badUserInput("notes");
    }
    if (notes.length > 2000) {
      throw badUserInput("notes", "Notes must be 2000 characters or fewer.");
    }
    if (notes.trim() === "") {
      return null;
    }
    return notes;
  }

  uuid(id: string, field: string): string {
    if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
      throw badUserInput(field, "Enter a valid id.");
    }
    return id;
  }

  clientId(clientId: string): string {
    if (typeof clientId !== "string" || clientId.length < 1 || clientId.length > 64) {
      throw badUserInput("clientId", "Enter a client id up to 64 characters.");
    }
    return clientId;
  }
}
