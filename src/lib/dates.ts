/** Quick date presets offered for a task's Date and Deadline fields. */
export type DatePreset = "none" | "today" | "tomorrow" | "next-week" | "next-month" | "custom";

export interface PresetOption {
  value: DatePreset;
  label: string;
  /** Extra search terms so typing in the dropdown finds the option. */
  keywords: string[];
}

export const DATE_PRESETS: PresetOption[] = [
  { value: "none", label: "None", keywords: ["no date", "clear", "unset"] },
  { value: "today", label: "Today", keywords: ["tod", "now"] },
  { value: "tomorrow", label: "Tomorrow", keywords: ["tom", "tmrw", "tmr"] },
  { value: "next-week", label: "Next week", keywords: ["week", "monday", "nw"] },
  { value: "next-month", label: "Next month", keywords: ["month", "nm"] },
  { value: "custom", label: "Pick a date…", keywords: ["custom", "calendar", "specific", "other"] },
];

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** The Monday after `d`. On a Sunday that is tomorrow; on a Monday it is a week away. */
export function nextMonday(d: Date): Date {
  const delta = (8 - d.getDay()) % 7 || 7;
  return addDays(d, delta);
}

export function firstOfNextMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/** Turn a preset (plus the custom picker's value) into a concrete local calendar day, or null for none. */
export function resolvePreset(preset: DatePreset, custom: Date | null, now: Date = new Date()): Date | null {
  switch (preset) {
    case "today":
      return startOfDay(now);
    case "tomorrow":
      return addDays(now, 1);
    case "next-week":
      return nextMonday(now);
    case "next-month":
      return firstOfNextMonth(now);
    case "custom":
      return custom ? startOfDay(custom) : null;
    default:
      return null;
  }
}

const shortDay = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

export function formatShortDay(d: Date): string {
  return shortDay.format(d);
}

/** Dropdown label with the resolved day appended, e.g. "Tomorrow (Wed 9 Sep)". */
export function presetTitle(option: PresetOption, now: Date = new Date()): string {
  const resolved = resolvePreset(option.value, null, now);
  return resolved ? `${option.label} (${formatShortDay(resolved)})` : option.label;
}
