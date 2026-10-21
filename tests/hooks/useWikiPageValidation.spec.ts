import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wikiPageExists } from 'src/api/wiki';
import { useWikiPageValidation } from 'src/hooks/useWikiPageValidation';

vi.mock('src/api/wiki', () => ({ wikiPageExists: vi.fn() }));
const url = 'https://darkdevotion.fandom.com/wiki/Hezek_-_The_Baptized';

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.stubEnv('VITE_WIKI_API_URL', 'https://darkdevotion.fandom.com/api.php');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('Wiki page URL validation', () => {
  it('blocks during debounce, restarts the timer on input, and allows a found page', async () => {
    vi.mocked(wikiPageExists).mockResolvedValue(true);
    const { result, rerender } = renderHook(({ value }) => useWikiPageValidation(value), {
      initialProps: { value: url },
    });
    expect(result.current).toMatchObject({ hasWikiPage: true, wikiStatus: 'checking', wikiValid: false });
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(wikiPageExists).not.toHaveBeenCalled();
    rerender({ value: `${url}_2` });
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(wikiPageExists).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(wikiPageExists).toHaveBeenCalledExactlyOnceWith('Hezek - The Baptized 2', expect.any(AbortSignal));
    expect(result.current).toMatchObject({ wikiStatus: 'found', wikiValid: true });
  });

  it('aborts on URL changes and ignores late results even if the request ignores abort', async () => {
    let resolveOld!: (exists: boolean) => void;
    vi.mocked(wikiPageExists).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    vi.mocked(wikiPageExists).mockResolvedValueOnce(false);
    const { result, rerender } = renderHook(({ value }) => useWikiPageValidation(value), {
      initialProps: { value: url },
    });
    await act(() => vi.advanceTimersByTimeAsync(500));
    const signal = vi.mocked(wikiPageExists).mock.calls[0]?.[1];
    expect(signal?.aborted).toBe(false);
    rerender({ value: `${url}_missing` });
    expect(signal?.aborted).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toMatchObject({ wikiStatus: 'missing', wikiValid: false });
    await act(async () => resolveOld(true));
    expect(result.current).toMatchObject({ wikiStatus: 'missing', wikiValid: false });
  });

  it('aborts on unmount', async () => {
    vi.mocked(wikiPageExists).mockReturnValue(
      new Promise(() => {
        // Keep the request pending until the hook unmounts.
      })
    );
    const { unmount } = renderHook(() => useWikiPageValidation(url));
    await act(() => vi.advanceTimersByTimeAsync(500));
    const signal = vi.mocked(wikiPageExists).mock.calls[0]?.[1];
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('blocks on network errors and supports retrying', async () => {
    vi.mocked(wikiPageExists).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(true);
    const { result } = renderHook(() => useWikiPageValidation(url));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toMatchObject({ wikiStatus: 'error', wikiValid: false });
    act(() => result.current.onWikiRetry());
    expect(result.current).toMatchObject({ wikiStatus: 'checking', wikiValid: false });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toMatchObject({ wikiStatus: 'found', wikiValid: true });
  });

  it.each(['', 'invalid', 'https://example.com/wiki/Test'])('does not check unrelated URL %j', async (value) => {
    const { result } = renderHook(() => useWikiPageValidation(value));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toMatchObject({ hasWikiPage: false, wikiStatus: 'idle', wikiValid: true });
    expect(wikiPageExists).not.toHaveBeenCalled();
  });

  it('rejects a matching origin without a usable page path', async () => {
    const { result } = renderHook(() => useWikiPageValidation('https://darkdevotion.fandom.com/wiki/'));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toMatchObject({ hasWikiPage: true, wikiStatus: 'invalid', wikiValid: false });
    expect(wikiPageExists).not.toHaveBeenCalled();
  });

  it('disables validation without configuration', async () => {
    vi.stubEnv('VITE_WIKI_API_URL', '');
    const { result } = renderHook(() => useWikiPageValidation(url));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(result.current).toMatchObject({ hasWikiPage: false, wikiStatus: 'idle', wikiValid: true });
    expect(wikiPageExists).not.toHaveBeenCalled();
  });
});
