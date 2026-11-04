import type { Router } from 'vue-router';
import { tools } from '@/tools';

export { trackEvent, installPageTracking };

// Both values are injected at build time (.env.production.local, git-ignored). Without them tracking is a no-op.
const endpoint = import.meta.env.VITE_UMAMI_ENDPOINT as string | undefined;
const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;

const isEnabled = Boolean(endpoint && websiteId) && navigator.doNotTrack !== '1';

function send(type: 'event', payload: Record<string, unknown>) {
  if (!isEnabled) {
    return;
  }

  const body = JSON.stringify({
    type,
    payload: {
      website: websiteId,
      hostname: location.hostname,
      url: location.pathname,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      title: document.title,
      referrer: document.referrer,
      ...payload,
    },
  });

  fetch(endpoint!, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

function trackEvent(name: string, data?: Record<string, string | number | boolean>) {
  send('event', { name, data });
}

function installPageTracking(router: Router) {
  const toolPaths = new Set(tools.map(tool => tool.path));

  router.afterEach((to) => {
    send('event', { url: to.fullPath.split('?')[0] });
    if (toolPaths.has(to.path)) {
      trackEvent('tool_open', { tool: to.path.slice(1) });
    }
  });
}
