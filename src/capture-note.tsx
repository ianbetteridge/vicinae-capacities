import { Action, ActionPanel, Form, Icon, LaunchProps, PopToRootType, showHUD, showToast, Toast } from "@vicinae/api";
import { useState } from "react";
import { saveToDailyNote, showErrorToast } from "./lib/capacities";

type Props = LaunchProps<{ arguments: { text?: string } }>;

export default function Command(props: Props) {
  const [text, setText] = useState(props.arguments.text ?? "");
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  async function submit() {
    const markdown = text.trim();
    if (!markdown) {
      setError("Write something first");
      return;
    }
    setIsSaving(true);
    await showToast({ style: Toast.Style.Animated, title: "Saving to daily note…" });
    try {
      await saveToDailyNote(markdown);
      await showHUD("Saved to daily note", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (e) {
      await showErrorToast(e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving}
      navigationTitle="Capture Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Daily Note" icon={Icon.Pencil} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Note"
        placeholder="Markdown is fine…"
        value={text}
        error={error}
        autoFocus
        onChange={(value) => {
          setText(value);
          if (error && value.trim()) setError(undefined);
        }}
      />
      <Form.Description text="Appended to today's daily note in the space your API token belongs to." />
    </Form>
  );
}
