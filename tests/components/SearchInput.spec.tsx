import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchInput } from 'src/components/SearchInput';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function change(value: string) {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
}

describe('SearchInput', () => {
  it('reports empty input through onClear immediately without treating non-empty short input as a reset', () => {
    const onSearchChange = vi.fn();
    const onClear = vi.fn();
    render(<SearchInput label="Search" placeholder="Search" onSearchChange={onSearchChange} onClear={onClear} />);
    change('alt');
    act(() => vi.advanceTimersByTime(300));
    change('a');
    change(' ');
    expect(onClear).not.toHaveBeenCalled();
    change('hezek');
    change('');
    expect(onClear).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(300));
    expect(onSearchChange.mock.calls).toEqual([['alt'], [''], ['']]);
  });

  it('keeps typing updates local until the applied query changes', () => {
    const onParentRender = vi.fn();

    function Harness() {
      const [query, setQuery] = useState('');
      onParentRender();

      return (
        <>
          <SearchInput label="Search" placeholder="Search" onSearchChange={setQuery} />
          <output aria-label="Applied query">{query}</output>
        </>
      );
    }

    render(<Harness />);
    const initialRenderCount = onParentRender.mock.calls.length;
    change('a');
    change('al');
    change('alt');
    act(() => vi.advanceTimersByTime(299));
    expect(onParentRender).toHaveBeenCalledTimes(initialRenderCount);
    expect(screen.getByLabelText('Applied query')).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(1));
    expect(onParentRender.mock.calls.length).toBeGreaterThan(initialRenderCount);
    expect(screen.getByLabelText('Applied query')).toHaveTextContent('alt');
    change('al');
    expect(screen.getByLabelText('Applied query')).toBeEmptyDOMElement();
  });

  it('updates the input immediately and notifies only after a 300ms pause with a normalized query', () => {
    const onSearchChange = vi.fn();
    render(
      <SearchInput label="Search entities" placeholder="Search (3+ characters)" onSearchChange={onSearchChange} />
    );
    const input = screen.getByRole('searchbox', { name: 'Search entities' });
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('placeholder', 'Search (3+ characters)');
    change('  aLt  ');
    expect(input).toHaveValue('  aLt  ');
    act(() => vi.advanceTimersByTime(299));
    expect(onSearchChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSearchChange).toHaveBeenCalledExactlyOnceWith('alt');
  });

  it('restarts the debounce on new input', () => {
    const onSearchChange = vi.fn();
    render(<SearchInput label="Search" placeholder="Search" onSearchChange={onSearchChange} />);
    change('alt');
    act(() => vi.advanceTimersByTime(200));
    change('hezek');
    act(() => vi.advanceTimersByTime(299));
    expect(onSearchChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSearchChange).toHaveBeenCalledExactlyOnceWith('hezek');
  });

  it.each(['', 'a', 'al', '   ', ' a '])(
    'clears filtering immediately for short input %j and cancels pending work',
    (value) => {
      const onSearchChange = vi.fn();
      render(<SearchInput label="Search" placeholder="Search" onSearchChange={onSearchChange} />);
      change('alt');
      act(() => vi.advanceTimersByTime(300));
      change('hezek');
      change(value);
      expect(onSearchChange.mock.calls).toEqual([['alt'], ['']]);
      act(() => vi.advanceTimersByTime(300));
      expect(onSearchChange).toHaveBeenCalledTimes(2);
    }
  );

  it('uses the latest callback without restarting pending work on a parent update', () => {
    const original = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<SearchInput label="Search" placeholder="Search" onSearchChange={original} />);
    change('alt');
    act(() => vi.advanceTimersByTime(200));
    rerender(<SearchInput label="Search" placeholder="Search" onSearchChange={latest} />);
    expect(screen.getByRole('searchbox')).toHaveValue('alt');
    act(() => vi.advanceTimersByTime(100));
    expect(original).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith('alt');
  });

  it('cancels pending work on unmount', () => {
    const onSearchChange = vi.fn();
    const { unmount } = render(<SearchInput label="Search" placeholder="Search" onSearchChange={onSearchChange} />);
    change('alt');
    unmount();
    act(() => vi.advanceTimersByTime(300));
    expect(onSearchChange).not.toHaveBeenCalled();
  });
});
