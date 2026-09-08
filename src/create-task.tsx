import { Action, ActionPanel, Form, Icon, LaunchProps, PopToRootType, showHUD, showToast, Toast } from "@vicinae/api";
import { useEffect, useState } from "react";
import { createTask, getTaskLabels, showErrorToast, TaskLabels } from "./lib/capacities";

type Props = LaunchProps<{ arguments: { title?: string } }>;

const NONE = "__none__";

export default function Command(props: Props) {
  const [title, setTitle] = useState(props.arguments.title ?? "");
  const [titleError, setTitleError] = useState<string | undefined>();
  const [priority, setPriority] = useState(NONE);
  const [status, setStatus] = useState(NONE);
  const [date, setDate] = useState<Date | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [labels, setLabels] = useState<TaskLabels | undefined>();
  const [isSaving, setIsSaving] = useState(false);

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
        date,
        deadline,
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
      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        <Form.Dropdown.Item value={NONE} title="No priority" icon={Icon.Minus} />
        {(labels?.priority ?? []).map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={Icon.Exclamationmark} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" value={status} onChange={setStatus}>
        <Form.Dropdown.Item value={NONE} title="Default" icon={Icon.Circle} />
        {(labels?.status ?? []).map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={Icon.Dot} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker id="date" title="Date" type={Form.DatePicker.Type.Date} value={date} onChange={setDate} />
      <Form.DatePicker id="deadline" title="Deadline" type={Form.DatePicker.Type.Date} value={deadline} onChange={setDeadline} />
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
