import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/useSettings";

export function AutoOpenPullRequestSwitch() {
  const { settings, updateSettings } = useSettings();
  const isEnabled = !!settings?.autoOpenPullRequest;

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Switch
          id="enable-auto-open-pull-request"
          aria-label="Open a pull request after every push"
          checked={isEnabled}
          onCheckedChange={(checked) => {
            updateSettings({
              autoOpenPullRequest: checked,
            });
          }}
        />
        <Label htmlFor="enable-auto-open-pull-request">
          Open a pull request after every push
        </Label>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        After Samba Builder pushes your branch to GitHub, it opens a pull
        request against the repository's default branch and shows the link. It
        never opens one from the default branch itself, and it never pushes for
        you.
      </div>
    </div>
  );
}
