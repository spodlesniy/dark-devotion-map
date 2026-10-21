import { useState } from 'react';

import { isValidEntityUrl } from 'src/helpers/isValidEntityUrl';
import { useWikiPageValidation } from 'src/hooks/useWikiPageValidation';
import type { MapEntityMetadata } from 'src/types/MapEntity';

export function useEntityMetadata(initial: MapEntityMetadata) {
  const [description, setDescription] = useState(initial.description ?? '');
  const [url, setUrl] = useState(initial.url ?? '');

  const { wikiValid, ...wikiFields } = useWikiPageValidation(url);

  const metadata: MapEntityMetadata = {
    ...(initial.description === undefined && description === '' ? {} : { description }),
    ...(initial.url === undefined && url === '' ? {} : { url }),
  };
  const urlValid = isValidEntityUrl(url);

  return {
    metadata,
    urlValid: urlValid && wikiValid,
    fields: { description, url, urlValid, ...wikiFields, onDescriptionChange: setDescription, onUrlChange: setUrl },
  };
}
