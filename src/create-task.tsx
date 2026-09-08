import { Action, ActionPanel, Form, Icon, LaunchProps, PopToRootType, showHUD, showToast, Toast } from "@vicinae/api";
import { useEffect, useMemo, useState } from "react";
import { createTask, getTaskLabels, showErrorToast, TaskLabels } from "./lib/capacities";
import { DATE_PRESETS, DatePreset, presetTitle, resolvePreset } from "./lib/dates";

type Props = LaunchProps<{ arguments: { title?: string } }>;

const NONE = "__none__";

const PRESET_ICONS: Record<DatePreset, Icon> = {
  none: Icon.Minus,
  today: Icon.Sun,
  tomorrow: Icon.ArrowRight,
  "next-week": Icon.Calendar,
  "next-month": Icon.Calendar,
  custom: Icon.Pencil,
};

interface DateFieldProps {
  id: string;
  title: string;
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  custom: Date | null;
  onCustomChange: (date: Date | null) => void;
  now: Date;
}

/** A preset dropdown (typeable) plus a date picker that appears when "Pick a date…" is chosen. */
function DateField({ id, title, preset, onPresetChange, custom, onCustomChange, now }: DateFieldProps) {
  return (
    <>
      <Form.Dropdown
        id={`${id}Preset`}
        title={title}
        value={preset}
        filtering
        onChange={(value) => onPresetChange(value as DatePreset)}
      >
        {DATE_PRESETS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={presetTitle(option, now)}
            icon={PRESET_ICONS[option.value]}
            keywords={option.keywords}
          />
        ))}
      </Form.Dropdown>
      {preset === "custom" && (
        <Form.DatePicker
          id={`${id}Custom`}
          title={`${title} (custom)`}
          type={Form.DatePicker.Type.Date}
          value={custom}
          onChange={onCustomChange}
        />
      )}
    </>
  );
}

export default function Command(props: Props) {
  const [title, setTitle] = useState(props.arguments.title ?? "");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [priority, setPriority] = useState(NONE);
  const [status, setStatus] = useState(NONE);
  const [datePreset, setDatePreset] = useState<DatePreset>("none");
  const [dateCustom, setDateCustom] = useState<Date | null>(null);
  const [deadlinePreset, setDeadlinePreset] = useState<DatePreset>("none");
  const [deadlineCustom, setDeadlineCustom] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [labels, setLabels] = useState<TaskLabels | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    let cancelled = false;
    getTaskLabels().then((result) => {
      if (!cancelled) setLabels(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!title.trim()) {
      setTitleError("A title is required");
      return;
    }
    setIsSaving(true);
    await showToast({ style: Toast.Style.Animated, title: "Creating task…" });
    try {
      await createTask({
        title,
        priority: priority === NONE ? undefined : priority,
        status: status === NONE ? undefined : status,
        date: resolvePreset(datePreset, dateCustom),
        deadline: resolvePreset(deadlinePreset, deadlineCustom),
        notes,
      });
      await showHUD("Task created", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (e) {
      await showErrorToast(e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving || labels === undefined}
      navigationTitle="Create Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.CheckCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What needs doing?"
        value={title}
        error={titleError}
        autoFocus
        onChange={(value) => {
          setTitle(value);
          if (titleError && value.trim()) setTitleError(undefined);
        }}
      />
      <Form.Separator />
      <DateField
        id="date"
        title="Date"
        preset={datePreset}
        onPresetChange={setDatePreset}
        custom={dateCustom}
        onCustomChange={setDateCustom}
        now={now}
      />
      <DateField
        id="deadline"
        title="Deadline"
        preset={deadlinePreset}
        onPresetChange={setDeadlinePreset}
        custom={deadlineCustom}
        onCustomChange={setDeadlineCustom}
        now={now}
      />
      <Form.Separator />
      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority} filtering>
        <Form.Dropdown.Item value={NONE} title="No priority" icon={Icon.Minus} />
        {(labels?.priority ?? []).map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={Icon.Exclamationmark} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" value={status} onChange={setStatus} filtering>
        <Form.Dropdown.Item value={NONE} title="Default" icon={Icon.Circle} />
        {(labels?.status ?? []).map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={Icon.Dot} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Optional. Markdown is fine…"
        value={notes}
        onChange={setNotes}
      />
    </Form>
  );
}
