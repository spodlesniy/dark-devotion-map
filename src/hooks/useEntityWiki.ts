import type { Popup, Tooltip } from 'leaflet';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { getWikiCodexDescription, getWikiDescription, getWikiImage, type WikiImage } from 'src/api/wiki';

type WikiResult = { description: string | null; image: WikiImage | null; failed: boolean };
type WikiState = WikiResult & { key: string; loading: boolean };

export function useEntityWiki(
  tooltipRef: RefObject<Popup | Tooltip | null>,
  title: string | null,
  mode: 'enemy' | 'npc' | 'codex' | 'title' | 'description',
  part?: number,
  totalParts?: number,
  anchor?: string
) {
  const [state, setState] = useState<WikiState | null>(null);

  const cache = useRef(new Map<string, Promise<WikiResult>>());
  const key = JSON.stringify([mode, title, part, totalParts, anchor]);
  const enabled = Boolean(import.meta.env.VITE_WIKI_API_URL?.trim());

  useEffect(() => {
    const tooltip = tooltipRef.current;

    if (!enabled || !tooltip || title === null) {
      return;
    }

    let active = true;
    let started = false;
    const pageTitle = title;

    function opened() {
      if (started) {
        return;
      }

      started = true;
      setState({ key, loading: true, description: null, image: null, failed: false });
      let pending = cache.current.get(key);

      if (!pending) {
        pending = Promise.allSettled([
          mode === 'codex'
            ? getWikiCodexDescription(pageTitle, part, totalParts, anchor)
            : mode === 'enemy' || mode === 'title' || mode === 'description'
              ? getWikiDescription(pageTitle)
              : Promise.resolve(null),
          mode === 'codex' || mode === 'description' ? Promise.resolve(null) : getWikiImage(pageTitle),
        ]).then(([description, image]) => ({
          description: description.status === 'fulfilled' ? description.value : null,
          image: image.status === 'fulfilled' ? image.value : null,
          failed: description.status === 'rejected' || image.status === 'rejected',
        }));
        cache.current.set(key, pending);
      }

      void pending.then((result) => {
        if (active) {
          setState({ ...result, key, loading: false });
        }
      });
    }

    tooltip.on('add', opened);

    if (tooltip.isOpen()) {
      opened();
    }

    return () => {
      active = false;
      tooltip.off('add', opened);
    };
  }, [tooltipRef, title, enabled, mode, part, totalParts, anchor, key]);

  return enabled && title !== null && state?.key === key ? state : null;
}
