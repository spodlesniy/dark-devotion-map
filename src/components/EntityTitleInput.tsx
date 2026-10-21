import { useEffect, useId, useRef, useState } from 'react';

import type { MapEntity } from 'src/types/MapEntity';
import { MapEntityType } from 'src/types/MapEntityType';

type SuggestedEntity = Extract<MapEntity, { type: MapEntityType.Enemy | MapEntityType.Npc }>;
type EntityTitleInputProps = {
  type: MapEntityType.Enemy | MapEntityType.Npc;
  value: string;
  entities: readonly MapEntity[];
  onChange: (value: string) => void;
  onSelect: (entity: SuggestedEntity) => void;
};

export function EntityTitleInput({ type, value, entities, onChange, onSelect }: Readonly<EntityTitleInputProps>) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(-1);

  const listRef = useRef<HTMLDivElement>(null);

  const listId = useId();
  const inputId = useId();

  const query = value.trim().toLowerCase();
  const titles = new Set<string>();
  const matches = entities.filter((entity): entity is SuggestedEntity => {
    if (entity.type !== type || (entity.type === MapEntityType.Enemy && entity.isBoss)) {
      return false;
    }

    const title = entity.title.toLowerCase();

    if (!query || !title.includes(query) || titles.has(title)) {
      return false;
    }

    titles.add(title);

    return true;
  });
  const open = expanded && matches.length > 0;
  const selected = active >= 0 && active < matches.length ? active : -1;

  useEffect(() => {
    if (open && selected >= 0) {
      listRef.current?.children[selected]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [open, selected]);

  function select(entity: SuggestedEntity) {
    onSelect(entity);
    setExpanded(false);
    setActive(-1);
  }

  return (
    <div className="point-title-autocomplete">
      <label htmlFor={inputId}>Title</label>
      <input
        id={inputId}
        name="title"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && selected >= 0 ? `${listId}-${selected}` : undefined}
        value={value}
        required
        onChange={(event) => {
          onChange(event.currentTarget.value);
          setExpanded(true);
          setActive(-1);
        }}
        onFocus={() => setExpanded(true)}
        onBlur={() => {
          setExpanded(false);
          setActive(-1);
        }}
        onKeyDown={(event) => {
          if (matches.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            setExpanded(true);
            setActive(
              event.key === 'ArrowDown'
                ? (selected + 1) % matches.length
                : selected <= 0
                  ? matches.length - 1
                  : selected - 1
            );
          } else if (open && event.key === 'Enter' && selected >= 0) {
            event.preventDefault();
            const entity = matches[selected];

            if (entity) {
              select(entity);
            }
          } else if (open && event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(false);
            setActive(-1);
          }
        }}
      />
      {open && (
        <div
          ref={listRef}
          tabIndex={-1}
          id={listId}
          role="listbox"
          aria-label={type === MapEntityType.Npc ? 'Existing NPCs' : 'Existing regular enemies'}
          className="point-title-autocomplete__list"
        >
          {matches.map((entity, index) => (
            <div
              tabIndex={-1}
              id={`${listId}-${index}`}
              key={entity.id}
              role="option"
              aria-selected={selected === index}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => select(entity)}
            >
              {entity.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
