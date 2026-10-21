import { useId } from 'react';

import type { WikiPageStatus } from 'src/hooks/useWikiPageValidation';

type EntityMetadataFieldsProps = {
  description: string;
  showDescription?: boolean;
  showUrl?: boolean;
  url: string;
  urlValid: boolean;
  hasWikiPage: boolean;
  wikiStatus: WikiPageStatus;
  onWikiRetry: () => void;
  onDescriptionChange: (value: string) => void;
  onUrlChange: (value: string) => void;
};

export function EntityMetadataFields({
  description,
  showDescription = true,
  showUrl = true,
  url,
  urlValid,
  hasWikiPage,
  wikiStatus,
  onWikiRetry,
  onDescriptionChange,
  onUrlChange,
}: Readonly<EntityMetadataFieldsProps>) {
  const errorId = useId();
  const urlId = useId();
  const wikiStatusId = useId();
  const wikiError = ['missing', 'error', 'invalid'].includes(wikiStatus);
  const wikiMessage = {
    idle: '',
    checking: 'Checking wiki page…',
    found: 'Wiki page found.',
    missing: 'Wiki page not found.',
    error: 'Could not check the wiki page. Try again.',
    invalid: 'Enter a wiki page URL containing /wiki/ and a page name.',
  }[wikiStatus];

  return (
    <>
      {showDescription && (
        <label>
          Description
          <textarea
            autoComplete="off"
            name="description"
            rows={5}
            value={description}
            onChange={(event) => onDescriptionChange(event.currentTarget.value)}
          />
        </label>
      )}
      {showUrl && (
        <div className="point-dialog__url-field">
          <div className="point-dialog__url-labels">
            <label htmlFor={urlId}>URL</label>
            <div className="point-dialog__wiki-validation">
              {wikiMessage && (
                <span
                  id={wikiStatusId}
                  role={wikiError ? 'alert' : 'status'}
                  className={`point-dialog__wiki-status${wikiStatus === 'missing' ? ' point-dialog__wiki-status--warning' : wikiError ? ' point-dialog__wiki-status--error' : ''}`}
                >
                  {wikiMessage}
                  {wikiStatus === 'error' && (
                    <button type="button" onClick={onWikiRetry}>
                      Retry
                    </button>
                  )}
                </span>
              )}
              <label className="point-dialog__wiki-page">
                <input autoComplete="off" type="checkbox" checked={hasWikiPage} disabled />
                Wiki Page
              </label>
            </div>
          </div>
          <input
            autoComplete="off"
            id={urlId}
            name="url"
            type="text"
            inputMode="url"
            value={url}
            aria-invalid={!urlValid || wikiError}
            aria-describedby={!urlValid ? errorId : wikiMessage ? wikiStatusId : undefined}
            onChange={(event) => onUrlChange(event.currentTarget.value)}
          />
        </div>
      )}
      {showUrl && !urlValid && (
        <p id={errorId} role="alert">
          Enter a valid absolute URL or leave this field empty.
        </p>
      )}
    </>
  );
}
