import { TeamTemplatesRepository } from "@/components/TeamTemplatesRepository";
import React, { useState, useCallback, useMemo } from "react";
import { BackButton } from "@/components/ui/back-button";
import { useSettings } from "@/hooks/useSettings";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateCard } from "@/components/TemplateCard";
import { CreateAppDialog } from "@/components/CreateAppDialog";

const TemplatesPage: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { templates, isLoading } = useTemplates();
  const { settings, updateSettings } = useSettings();
  const selectedTemplateId = settings?.selectedTemplateId;

  // ⚡ Bolt Optimization: Wrapped in useCallback to prevent child components (TemplateCard) from re-rendering due to inline function references breaking React.memo shallow equality.
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      updateSettings({ selectedTemplateId: templateId });
    },
    [updateSettings],
  );

  // ⚡ Bolt Optimization: Wrapped in useCallback to prevent child component re-renders.
  const handleCreateApp = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const handleAcceptCommunityCode = useCallback(() => {
    updateSettings({ acceptedCommunityCode: true });
  }, [updateSettings]);

  // ⚡ Bolt Optimization: Wrapped filtered template lists in useMemo to avoid filtering on every re-render.
  const officialTemplates = useMemo(
    () => templates?.filter((template) => template.isOfficial) || [],
    [templates],
  );
  const communityTemplates = useMemo(
    () =>
      templates?.filter(
        (template) => !template.isOfficial && !template.isTeam,
      ) || [],
    [templates],
  );

  const teamTemplates = useMemo(
    () => templates?.filter((template) => template.isTeam) || [],
    [templates],
  );

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-5xl mx-auto pb-12">
        <BackButton />
        <header className="mb-8 text-left">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pick your default template
          </h1>
          <p className="text-md text-gray-600 dark:text-gray-400">
            Choose a starting point for your new project.
            {isLoading && " Loading additional templates..."}
          </p>
        </header>

        <TeamTemplatesRepository />
        {teamTemplates.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Templates da equipe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teamTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  hasAcceptedCommunityCode={!!settings?.acceptedCommunityCode}
                  hasNeonToken={!!settings?.neon?.accessToken}
                  onSelect={handleTemplateSelect}
                  onCreateApp={handleCreateApp}
                  onAcceptCommunityCode={handleAcceptCommunityCode}
                />
              ))}
            </div>
          </section>
        )}
        {/* Official Templates Section */}
        {officialTemplates.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Official templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {officialTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  hasAcceptedCommunityCode={!!settings?.acceptedCommunityCode}
                  hasNeonToken={!!settings?.neon?.accessToken}
                  onSelect={handleTemplateSelect}
                  onCreateApp={handleCreateApp}
                  onAcceptCommunityCode={handleAcceptCommunityCode}
                />
              ))}
            </div>
          </section>
        )}

        {/* Community Templates Section */}
        {communityTemplates.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Community templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  hasAcceptedCommunityCode={!!settings?.acceptedCommunityCode}
                  hasNeonToken={!!settings?.neon?.accessToken}
                  onSelect={handleTemplateSelect}
                  onCreateApp={handleCreateApp}
                  onAcceptCommunityCode={handleAcceptCommunityCode}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <CreateAppDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        template={templates?.find((t) => t.id === settings?.selectedTemplateId)}
      />
    </div>
  );
};

export default TemplatesPage;
