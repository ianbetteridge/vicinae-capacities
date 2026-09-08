import { Cache, getPreferenceValues, showToast, Toast } from "@vicinae/api";
import { CapacitiesApiError, CapacitiesClient, CapacitiesErrorCode } from "@capacities/api";

/** Extension-level preferences declared in package.json. */
export interface ExtensionPrefs {
  apiToken: string;
  noTimestamp: boolean;
}

/** Built-in structure id of the Task object type in every Capacities space. */
export const TASK_STRUCTURE_ID = "RootTask";

const DEFAULT_TASK_LABELS: TaskLabels = {
  priority: ["Low", "Medium", "High"],
  status: ["Not Started", "Next Up", "Delegated", "In Progress", "Done", "Dropped"],
};

const LABELS_CACHE_KEY = "task-labels-v1";
const LABELS_TTL_MS = 24 * 60 * 60 * 1000;

let client: CapacitiesClient | undefined;

export function getClient(): CapacitiesClient {
  if (client) return client;
  const { apiToken } = getPreferenceValues<ExtensionPrefs>();
  client = new CapacitiesClient({ apiToken: apiToken.trim() });
  return client;
}

/** Append Markdown to today's daily note in the space the token belongs to. */
export async function saveToDailyNote(markdown: string): Promise<void> {
  const { noTimestamp } = getPreferenceValues<ExtensionPrefs>();
  await getClient().blocks.dailyNote.append({
    markdown,
    noTimeStamp: noTimestamp === true,
  });
}

export interface TaskInput {
  title: string;
  priority?: string;
  status?: string;
  date?: Date | null;
  deadline?: Date | null;
  notes?: string;
}

/**
 * Create a Task object via the Markdown import endpoint.
 *
 * Properties go in YAML frontmatter, keyed by the frontmatter keys Capacities
 * documents for the Task type (label values are option names, dates are
 * YYYY-MM-DD). The body after the frontmatter becomes the task's notes.
 */
export async function createTask(input: TaskInput): Promise<{ id: string }> {
  const frontmatter: string[] = [`title: ${yamlString(input.title.trim())}`];
  if (input.priority) frontmatter.push(`priority: ${yamlString(input.priority)}`);
  if (input.status) frontmatter.push(`status: ${yamlString(input.status)}`);
  if (input.date) frontmatter.push(`date: ${toDayString(input.date)}`);
  if (input.deadline) frontmatter.push(`deadline: ${toDayString(input.deadline)}`);

  const notes = input.notes?.trim();
  const markdown = `---\n${frontmatter.join("\n")}\n---\n${notes ? `\n${notes}\n` : ""}`;

  const created = await getClient().object.markdown.create({
    structureId: TASK_STRUCTURE_ID,
    markdown,
  });
  return { id: created.id };
}

export interface TaskLabels {
  priority: string[];
  status: string[];
}

/**
 * Read the Task type's priority and status label names from the space so the
 * dropdowns reflect what the user actually has. Cached for a day because the
 * structures endpoint has the tightest rate limit (10 requests per minute).
 * Falls back to the stock Capacities labels if anything goes wrong.
 */
export async function getTaskLabels(): Promise<TaskLabels> {
  const cache = new Cache({ namespace: "capacities" });
  const cached = cache.get(LABELS_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { at: number; labels: TaskLabels };
      if (Date.now() - parsed.at < LABELS_TTL_MS && isTaskLabels(parsed.labels)) {
        return parsed.labels;
      }
    } catch {
      // ignore a corrupt cache entry and refetch
    }
  }

  try {
    const { structures } = await getClient().space.structures();
    const task = structures.find((s) => s.id === TASK_STRUCTURE_ID);
    if (!task) return DEFAULT_TASK_LABELS;

    const names = (propertyId: string, fallback: string[]): string[] => {
      const def = task.propertyDefinitions.find((p) => p.id === propertyId);
      const options = def?.labelSet?.map((o) => o.name).filter((n) => n.length > 0) ?? [];
      return options.length > 0 ? options : fallback;
    };

    const labels: TaskLabels = {
      priority: names("priority", DEFAULT_TASK_LABELS.priority),
      status: names("status", DEFAULT_TASK_LABELS.status),
    };
    cache.set(LABELS_CACHE_KEY, JSON.stringify({ at: Date.now(), labels }));
    return labels;
  } catch {
    return DEFAULT_TASK_LABELS;
  }
}

function isTaskLabels(value: unknown): value is TaskLabels {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.priority) && Array.isArray(v.status);
}

/** Local calendar day as YYYY-MM-DD (what the Task date properties expect for all-day dates). */
export function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Quote a scalar for YAML frontmatter so titles with colons, quotes or hashes survive. */
export function yamlString(value: string): string {
  return JSON.stringify(value);
}

/** Turn an API failure into a short, actionable message for a toast. */
export function describeError(error: unknown): { title: string; message?: string } {
  if (error instanceof CapacitiesApiError) {
    switch (error.code) {
      case CapacitiesErrorCode.NotAuthenticated:
        return { title: "Capacities rejected the API token", message: "Check it in the extension preferences." };
      case CapacitiesErrorCode.ScopeInsufficient:
        return { title: "Token lacks the api:write scope", message: "Generate a new token with write access." };
      case CapacitiesErrorCode.RateLimitExceeded:
        return { title: "Capacities rate limit hit", message: "Wait a minute and try again." };
      case CapacitiesErrorCode.ObjectCreationQuotaReached:
        return { title: "Object creation quota reached", message: "Capacities is refusing new objects via the API for now." };
      case CapacitiesErrorCode.ServiceUnavailable:
      case CapacitiesErrorCode.ServerError:
        return { title: "Capacities is unavailable", message: `HTTP ${error.status}. Try again shortly.` };
      default:
        return { title: "Capacities returned an error", message: `${error.code} (HTTP ${error.status})` };
    }
  }
  if (error instanceof Error) {
    const offline = /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(error.message);
    return {
      title: offline ? "Could not reach api.capacities.io" : "Something went wrong",
      message: offline ? "Check your connection." : error.message,
    };
  }
  return { title: "Something went wrong" };
}

/** Show a failure toast for an error. Vicinae toasts have no action buttons, so the hint lives in the message. */
export async function showErrorToast(error: unknown): Promise<void> {
  const { title, message } = describeError(error);
  await showToast({ style: Toast.Style.Failure, title, message });
}
