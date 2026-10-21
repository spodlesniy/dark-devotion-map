import { useEffect, useId, useRef, useState } from 'react';

import './PointCreation.scss';

import { DefaultMapTitleColor } from 'src/common/titleSettings';
import { EntityMetadataFields } from 'src/components/EntityMetadataFields';
import { EntityTitleInput } from 'src/components/EntityTitleInput';
import { PointPlaceFields } from 'src/components/PointPlaceFields';
import { codexPartsError } from 'src/helpers/codexPartsError';
import { entityFieldVisibility } from 'src/helpers/entityFieldVisibility';
import { parseMapPointDetails } from 'src/helpers/mapEntityDatabase';
import { useEntityMetadata } from 'src/hooks/useEntityMetadata';
import type { MapEntity, MapEntityFields, MapPointDetails, MapPointFields, MapPosition } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapItemType } from 'src/types/MapItemType';
import { MapPlaceType } from 'src/types/MapPlaceType';
import { MapTitleSize } from 'src/types/MapTitleSize';

type AddPointDialogProps = {
  position: MapPosition;
  suggestionEntities?: readonly MapEntity[];
  initialDetails?: MapPointDetails & Partial<MapEntityFields>;
  editing?: boolean;
  onAdd: (details: MapPointFields, position: MapPosition) => void;
  onCancel: () => void;
};

export function AddPointDialog({
  position,
  suggestionEntities = [],
  initialDetails = { type: MapEntityType.Npc },
  editing = false,
  onAdd,
  onCancel,
}: Readonly<AddPointDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const titleId = useId();

  const [type, setType] = useState(initialDetails.type);
  const [isElite, setIsElite] = useState(
    initialDetails.type === MapEntityType.Enemy && initialDetails.isElite === true
  );
  const [isBoss, setIsBoss] = useState(initialDetails.type === MapEntityType.Enemy && initialDetails.isBoss);
  const [placeType, setPlaceType] = useState(
    initialDetails.type === MapEntityType.Place ? initialDetails.placeType : MapPlaceType.Tablet
  );
  const [itemType, setItemType] = useState(
    initialDetails.type === MapEntityType.Item ? initialDetails.itemType : MapItemType.Weapon
  );
  const [title, setTitle] = useState(entityFieldVisibility(initialDetails).title ? (initialDetails.title ?? '') : '');
  const [group, setGroup] = useState(initialDetails.type === MapEntityType.Codex ? (initialDetails.group ?? '') : '');
  const [part, setPart] = useState(
    initialDetails.type === MapEntityType.Codex ? String(initialDetails.part ?? '') : ''
  );
  const [totalParts, setTotalParts] = useState(
    initialDetails.type === MapEntityType.Codex ? String(initialDetails.totalParts ?? '') : ''
  );
  const [size, setSize] = useState(
    initialDetails.type === MapEntityType.Title ? initialDetails.size : MapTitleSize.Medium
  );
  const [color, setColor] = useState(
    initialDetails.type === MapEntityType.Title ? initialDetails.color : DefaultMapTitleColor
  );
  const [error, setError] = useState<string | null>(null);

  const partsError =
    type === MapEntityType.Codex
      ? codexPartsError(part === '' ? undefined : Number(part), totalParts === '' ? undefined : Number(totalParts))
      : null;
  const visibility = entityFieldVisibility({ type, placeType, itemType });
  const { metadata, urlValid, fields } = useEntityMetadata({
    ...initialDetails,
    ...(!entityFieldVisibility(initialDetails).url && initialDetails.url !== undefined ? { url: '' } : {}),
    ...(!entityFieldVisibility(initialDetails).description && initialDetails.description !== undefined
      ? { description: '' }
      : {}),
  });

  function changeDetails(nextType: MapEntityType, nextPlaceType: MapPlaceType, nextItemType = itemType) {
    const nextVisibility = entityFieldVisibility({ type: nextType, placeType: nextPlaceType, itemType: nextItemType });
    setType(nextType);
    setPlaceType(nextPlaceType);
    setItemType(nextItemType);
    setError(null);

    if (nextType !== MapEntityType.Codex) {
      setGroup('');
    }

    if (!nextVisibility.title) {
      setTitle('');
    }

    if (!nextVisibility.description) {
      fields.onDescriptionChange('');
    }

    if (!nextVisibility.url) {
      fields.onUrlChange('');
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();

    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="point-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        // Let the native dialog handle Escape without also closing the drawer.
        if (event.key === 'Escape') {
          event.stopPropagation();
        }
      }}
    >
      <form
        className="point-dialog__form"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();

          if (partsError || (visibility.url && !urlValid)) {
            return;
          }

          const data = new FormData(event.currentTarget);
          const trimmedTitle = title.trim();

          if (visibility.titleRequired && !trimmedTitle) {
            setError('Enter a title.');

            return;
          }

          try {
            const details = parseMapPointDetails({
              type: data.get('type'),
              ...(type === MapEntityType.Title ? { size, color } : {}),
              ...(type === MapEntityType.Codex
                ? {
                    isSavedToLibrary: data.has('isSavedToLibrary'),
                    ...(group.trim() ? { group: group.trim() } : {}),
                    ...(part === '' ? {} : { part: Number(part) }),
                    ...(totalParts === '' ? {} : { totalParts: Number(totalParts) }),
                  }
                : {}),
              ...(type === MapEntityType.Enemy ? { isBoss: data.has('isBoss'), isElite: data.has('isElite') } : {}),
              ...(type === MapEntityType.Place
                ? {
                    placeType: data.get('placeType'),
                    ...(data.has('switchType') ? { switchType: data.get('switchType') } : {}),
                    ...(data.has('variant') ? { variant: Number(data.get('variant')) } : {}),
                    ...(data.has('trapType') ? { trapType: data.get('trapType') } : {}),
                    ...(data.has('blockerType') ? { blockerType: data.get('blockerType') } : {}),
                    ...(data.has('tabletType') ? { tabletType: data.get('tabletType') } : {}),
                    ...(data.has('altarType') ? { altarType: data.get('altarType') } : {}),
                    ...(data.get('faithCost') ? { faithCost: Number(data.get('faithCost')) } : {}),
                  }
                : {}),
              ...(type === MapEntityType.Item ? { itemType: data.get('itemType') } : {}),
            });
            const visibleMetadata = {
              ...(visibility.description && metadata.description !== undefined
                ? { description: metadata.description }
                : {}),
              ...(visibility.url && metadata.url !== undefined ? { url: metadata.url } : {}),
            };

            if (
              (details.type === MapEntityType.Place && details.placeType === MapPlaceType.LostRoom) ||
              (details.type === MapEntityType.Item && details.itemType === MapItemType.PrisonKey)
            ) {
              onAdd({ ...details, ...visibleMetadata, ...(trimmedTitle ? { title: trimmedTitle } : {}) }, position);
            } else if (
              details.type === MapEntityType.Place ||
              (details.type === MapEntityType.Item && details.itemType === MapItemType.Arrows)
            ) {
              onAdd({ ...details, ...visibleMetadata }, position);
            } else {
              onAdd({ ...details, ...visibleMetadata, title: trimmedTitle }, position);
            }
          } catch {
            setError(`Could not ${editing ? 'save' : 'add'} this point. Try again.`);
          }
        }}
      >
        <header className="point-dialog__header">
          <h2 id={titleId}>{editing ? 'Edit point' : 'Add point'}</h2>
          <span className="point-dialog__notice">Changes stay in memory until exported.</span>
          <button type="button" aria-label="Close dialog" onClick={onCancel}>
            ×
          </button>
        </header>
        <label>
          Type
          <select
            name="type"
            value={type}
            onChange={(event) => changeDetails(event.currentTarget.value as MapEntityType, placeType)}
          >
            <option value={MapEntityType.Npc}>NPC</option>
            <option value={MapEntityType.Enemy}>Enemy</option>
            <option value={MapEntityType.Item}>Item</option>
            <option value={MapEntityType.Place}>Place</option>
            <option value={MapEntityType.Codex}>Codex</option>
            <option value={MapEntityType.Title}>Title</option>
          </select>
        </label>
        {type === MapEntityType.Title && (
          <div className="point-dialog__title-fields">
            <label>
              Font size
              <select
                name="size"
                required
                value={size}
                onChange={(event) => setSize(event.currentTarget.value as MapTitleSize)}
              >
                <option value={MapTitleSize.Huge}>Huge</option>
                <option value={MapTitleSize.Big}>Big</option>
                <option value={MapTitleSize.Medium}>Medium</option>
                <option value={MapTitleSize.Small}>Small</option>
              </select>
            </label>
            <label>
              Color
              <input
                autoComplete="off"
                name="color"
                type="color"
                required
                value={color}
                onChange={(event) => setColor(event.currentTarget.value)}
              />
            </label>
          </div>
        )}
        {type === MapEntityType.Codex && (
          <>
            <div className="point-dialog__codex-fields">
              <label>
                Part
                <input
                  autoComplete="off"
                  name="part"
                  type="number"
                  min="1"
                  step="1"
                  value={part}
                  onChange={(event) => setPart(event.currentTarget.value)}
                  aria-invalid={Boolean(partsError)}
                />
              </label>
              <label>
                Total parts
                <input
                  autoComplete="off"
                  name="totalParts"
                  type="number"
                  min="1"
                  step="1"
                  value={totalParts}
                  onChange={(event) => setTotalParts(event.currentTarget.value)}
                  aria-invalid={Boolean(partsError)}
                />
              </label>
              <label className="point-dialog__boss">
                Saved to library
                <input
                  autoComplete="off"
                  type="checkbox"
                  name="isSavedToLibrary"
                  defaultChecked={
                    initialDetails.type === MapEntityType.Codex && initialDetails.isSavedToLibrary === true
                  }
                />
              </label>
            </div>
            {partsError && <p role="alert">{partsError}</p>}
          </>
        )}
        {type === MapEntityType.Enemy && (
          <div className="point-dialog__enemy-flags">
            <label className="point-dialog__boss">
              Elite
              <input
                autoComplete="off"
                type="checkbox"
                name="isElite"
                checked={isElite}
                disabled={isBoss}
                onChange={(event) => setIsElite(event.currentTarget.checked)}
              />
            </label>
            <label className="point-dialog__boss">
              Boss
              <input
                autoComplete="off"
                type="checkbox"
                name="isBoss"
                checked={isBoss}
                disabled={isElite}
                onChange={(event) => setIsBoss(event.currentTarget.checked)}
              />
            </label>
          </div>
        )}
        {type === MapEntityType.Place && (
          <PointPlaceFields
            initialDetails={initialDetails.type === MapEntityType.Place ? initialDetails : undefined}
            placeType={placeType}
            onPlaceTypeChange={(value) => changeDetails(type, value)}
          />
        )}
        {type === MapEntityType.Item && (
          <label>
            Item type
            <select
              name="itemType"
              value={itemType}
              onChange={(event) => changeDetails(type, placeType, event.currentTarget.value as MapItemType)}
            >
              <option value={MapItemType.Weapon}>Weapon</option>
              <option value={MapItemType.LeftHand}>Left hand</option>
              <option value={MapItemType.Armor}>Armor</option>
              <option value={MapItemType.Rune}>Rune</option>
              <option value={MapItemType.Trinket}>Trinket</option>
              <option value={MapItemType.Consumable}>Consumable</option>
              <option value={MapItemType.PrisonKey}>Prison key</option>
              <option value={MapItemType.Arrows}>Arrows</option>
            </select>
          </label>
        )}
        {visibility.title &&
          (type === MapEntityType.Npc || (type === MapEntityType.Enemy && !isBoss) ? (
            <EntityTitleInput
              type={type}
              value={title}
              entities={suggestionEntities}
              onChange={setTitle}
              onSelect={(entity) => {
                setTitle(entity.title);

                if (entity.type === MapEntityType.Enemy) {
                  fields.onDescriptionChange(entity.description ?? '');
                }

                fields.onUrlChange(entity.url ?? '');
                setError(null);
              }}
            />
          ) : (
            <label className={type === MapEntityType.Codex ? 'point-dialog__codex-title' : undefined}>
              Title
              <input
                autoComplete="off"
                name="title"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                required={visibility.titleRequired}
              />
            </label>
          ))}
        {type === MapEntityType.Codex && (
          <label className="point-dialog__codex-group">
            Group
            <input
              autoComplete="off"
              name="group"
              value={group}
              onChange={(event) => setGroup(event.currentTarget.value)}
            />
          </label>
        )}
        <EntityMetadataFields {...fields} showDescription={visibility.description} showUrl={visibility.url} />
        {error && <p role="alert">{error}</p>}
        <footer className="point-dialog__actions">
          <p className="point-dialog__coordinates" title="Original map pixels. Use Move on the map to change position.">
            Position: X {position.x} · Y {position.y} px
          </p>

          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={Boolean(partsError) || (visibility.url && !urlValid)}>
            {editing ? 'Save' : 'Add'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
