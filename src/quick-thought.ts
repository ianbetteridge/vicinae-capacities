import { LaunchProps, PopToRootType, showHUD, showToast, Toast } from "@vicinae/api";
import { saveToDailyNote, showErrorToast } from "./lib/capacities";

type Props = LaunchProps<{ arguments: { text: string } }>;

export default async function Command(props: Props) {
  const text = props.arguments.text?.trim() ?? "";
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing to save" });
    return;
  }

  await showToast({ style: Toast.Style.Animated, title: "Saving to daily note…" });
  try {
    await saveToDailyNote(text);
    await showHUD("Saved to daily note", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showErrorToast(error);
  }
}
