'use client';

import { useAuth } from '@/hooks/useAuth';
import { useShortcutPrompt } from '@/hooks/useShortcutPrompt';
import { ShortcutPrompt } from '@/components/ShortcutPrompt';

export function ShortcutPromptHost() {
  const { user, userData, loading, needsOnboarding } = useAuth();
  const ready = !loading && !!user && !!userData && !needsOnboarding;
  const { showPrompt, platform, dismissPrompt } = useShortcutPrompt(ready);

  return (
    <ShortcutPrompt show={showPrompt} platform={platform} onDismiss={dismissPrompt} />
  );
}
