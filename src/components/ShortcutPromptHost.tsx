'use client';

import { useAuth } from '@/hooks/useAuth';
import { useShortcutPrompt } from '@/hooks/useShortcutPrompt';
import { ShortcutPrompt } from '@/components/ShortcutPrompt';

export function ShortcutPromptHost() {
  const { user, userData, loading, needsOnboarding } = useAuth();
  const ready = !loading && !!user && !!userData && !needsOnboarding;
  const { showPrompt, platform, adding, addResult, addShortcut, dismissPrompt } =
    useShortcutPrompt(ready);

  return (
    <ShortcutPrompt
      show={showPrompt}
      platform={platform}
      adding={adding}
      addResult={addResult}
      onAdd={addShortcut}
      onDismiss={dismissPrompt}
    />
  );
}
