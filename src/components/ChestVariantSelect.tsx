import { type KeyboardEvent, useId, useState } from 'react';

import { getPointIconUrl } from 'src/helpers/pointIcons';
import { chestVariants, type MapChestVariant } from 'src/types/MapChestVariant';
import { MapEntityType } from 'src/types/MapEntityType';
import { MapPlaceType } from 'src/types/MapPlaceType';

function VariantImage({ url, variant }: Readonly<{ url: string | null; variant: MapChestVariant }>) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return <span>{variant}</span>;
  }

  return <img src={url} alt={String(variant)} draggable={false} onError={() => setFailed(true)} />;
}

function VariantAppearance({ variant }: Readonly<{ variant: MapChestVariant }>) {
  const url = getPointIconUrl({ type: MapEntityType.Place, placeType: MapPlaceType.Chest, variant });

  return <VariantImage key={url} url={url} variant={variant} />;
}

export function ChestVariantSelect({ initialValue }: Readonly<{ initialValue: MapChestVariant }>) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(initialValue);

  const id = useId();

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      const next =
        event.key === 'Home'
          ? 1
          : event.key === 'End'
            ? 5
            : Math.max(1, Math.min(5, active + (event.key === 'ArrowDown' ? 1 : -1)));
      setActive(next as MapChestVariant);
    } else if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      setValue(active);
      setOpen(false);
    }
  }

  return (
    <div className="chest-variant-select">
      <span id={`${id}-label`}>Variant</span>
      <input type="hidden" name="variant" value={value} />
      <button
        type="button"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-haspopup="listbox"
        aria-required="true"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        onClick={() => {
          setActive(value);
          setOpen(!open);
        }}
      >
        <VariantAppearance variant={value} />
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="chest-variant-select__list" id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}>
          {chestVariants.map((variant) => (
            <div
              key={variant}
              id={`${id}-${variant}`}
              role="option"
              tabIndex={-1}
              aria-label={String(variant)}
              aria-selected={value === variant}
              data-active={active === variant}
              onPointerDown={(event) => event.preventDefault()}
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={() => setActive(variant)}
              onClick={() => {
                setValue(variant);
                setOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setValue(variant);
                  setOpen(false);
                }
              }}
            >
              <VariantAppearance variant={variant} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
