import { useEffect, useEffectEvent, useState } from 'react';

type SearchInputProps = {
  label: string;
  placeholder: string;
  onSearchChange: (query: string) => void;
  onClear?: () => void;
};

export function SearchInput({ label, placeholder, onSearchChange, onClear }: Readonly<SearchInputProps>) {
  const [value, setValue] = useState('');

  const notifySearchChange = useEffectEvent(onSearchChange);

  useEffect(() => {
    const query = value.trim().toLowerCase();

    if (query.length < 3) {
      return;
    }

    const timer = setTimeout(() => notifySearchChange(query), 300);

    return () => clearTimeout(timer);
  }, [value]);

  function updateValue(nextValue: string) {
    setValue(nextValue);

    if (nextValue === '' && onClear) {
      onClear();

      return;
    }

    if (nextValue.trim().length < 3) {
      onSearchChange('');
    }
  }

  return (
    <input
      autoComplete="off"
      type="search"
      aria-label={label}
      value={value}
      onChange={(event) => updateValue(event.target.value)}
      placeholder={placeholder}
    />
  );
}
