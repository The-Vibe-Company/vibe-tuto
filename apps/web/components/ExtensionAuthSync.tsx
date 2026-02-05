'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Syncs authentication state with the CapTuto Chrome extension.
 * This component sends the auth token to the extension's content script
 * whenever the dashboard loads, ensuring the extension knows the user is logged in.
 */
export function ExtensionAuthSync() {
  useEffect(() => {
    const syncAuthToExtension = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && session?.user?.email) {
        window.postMessage(
          {
            type: 'CAPTUTO_AUTH',
            authToken: session.access_token,
            userEmail: session.user.email,
          },
          window.location.origin
        );
      }
    };

    syncAuthToExtension();
  }, []);

  return null;
}
