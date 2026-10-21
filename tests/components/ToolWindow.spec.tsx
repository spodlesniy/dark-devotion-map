import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolWindow } from 'src/components/ToolWindow';

const capture = vi.fn();
const release = vi.fn();

beforeEach(() => {
  vi.stubGlobal('innerWidth', 1000);
  vi.stubGlobal('innerHeight', 600);
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      readonly pointerId: number;

      constructor(type: string, options: PointerEventInit = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
      }
    }
  );
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: capture });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', { configurable: true, value: release });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const windowElement = this.closest('.tool-window') as HTMLElement | null;
    const x = Number.parseFloat(windowElement?.style.left || '660');
    const y = Number.parseFloat(windowElement?.style.top || '16');

    return new DOMRect(x, y, 320, this.classList.contains('tool-window__header') ? 44 : 300);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
  Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture');
});

function setup() {
  render(
    <ToolWindow title="Developer tools">
      <input aria-label="Draft" defaultValue="Working value" />
    </ToolWindow>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Expand developer tools' }));
  const panel = screen.getByRole('region', { name: 'Developer tools' });
  const header = panel.querySelector('header');

  if (!header) {
    throw new Error('Expected a draggable header');
  }

  return { panel, header, user: userEvent.setup() };
}

describe('Tool window', () => {
  it('starts collapsed and reveals controls and status when expanded', async () => {
    render(
      <ToolWindow title="Developer tools" status="12 entities loaded.">
        <input aria-label="Draft" defaultValue="Working value" />
      </ToolWindow>
    );
    expect(screen.getByRole('button', { name: 'Expand developer tools' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox', { name: 'Draft' })).not.toBeInTheDocument();
    expect(screen.getByText('12 entities loaded.')).not.toBeVisible();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Expand developer tools' }));
    expect(screen.getByRole('textbox', { name: 'Draft' })).toBeVisible();
    expect(screen.getByText('12 entities loaded.')).toBeVisible();
  });

  it('drags by its header, captures the pointer, and keeps only the header within the viewport', () => {
    const { panel, header } = setup();
    fireEvent.pointerDown(header, { button: 0, clientX: 680, clientY: 30 });
    expect(capture).toHaveBeenCalledWith(1);
    fireEvent.pointerMove(header, { pointerId: 2, clientX: 100, clientY: 100 });
    expect(panel).toHaveStyle({ left: '660px', top: '16px' });
    fireEvent.pointerMove(header, { clientX: 220, clientY: 200 });
    expect(panel).toHaveStyle({ left: '200px', top: '186px' });
    fireEvent.pointerMove(header, { clientX: 1500, clientY: 1000 });
    expect(panel).toHaveStyle({ left: '680px', top: '556px' });
    fireEvent.pointerMove(header, { clientX: -50, clientY: -50 });
    expect(panel).toHaveStyle({ left: '0px', top: '0px' });
    fireEvent.pointerUp(header);
    expect(release).toHaveBeenCalledOnce();
    fireEvent.pointerMove(header, { clientX: 400, clientY: 400 });
    expect(panel).toHaveStyle({ left: '0px', top: '0px' });
  });

  it('collapses to its header and preserves contents and position when expanded', async () => {
    const { panel, header, user } = setup();
    const draft = screen.getByRole('textbox', { name: 'Draft' });
    fireEvent.change(draft, { target: { value: 'Edited value' } });
    await user.click(screen.getByRole('button', { name: 'Collapse developer tools' }));
    expect(draft).not.toBeVisible();
    expect(header).toBeVisible();
    fireEvent.pointerDown(header, { button: 0, clientX: 680, clientY: 30 });
    fireEvent.pointerMove(header, { clientX: 220, clientY: 200 });
    fireEvent.pointerUp(header);
    await user.click(screen.getByRole('button', { name: 'Expand developer tools' }));
    expect(draft).toBeVisible();
    expect(draft).toHaveValue('Edited value');
    expect(panel).toHaveStyle({ left: '200px', top: '186px' });
  });

  it('keeps the header accessible after viewport resize without moving it for content changes', () => {
    const { panel } = setup();
    vi.stubGlobal('innerWidth', 500);
    vi.stubGlobal('innerHeight', 50);
    fireEvent(window, new Event('resize'));
    expect(panel).toHaveStyle({ left: '180px', top: '6px' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Long content' } });
    expect(panel).toHaveStyle({ left: '180px', top: '6px' });
  });

  it('does not start dragging from the collapse button or a secondary pointer button and stops after cancellation', () => {
    const { panel, header } = setup();
    fireEvent.pointerDown(screen.getByRole('button'), { button: 0 });
    fireEvent.pointerDown(header, { button: 2 });
    expect(capture).not.toHaveBeenCalled();
    fireEvent.pointerDown(header, { button: 0, clientX: 680, clientY: 30 });
    fireEvent.pointerCancel(header);
    fireEvent.pointerMove(header, { clientX: 220, clientY: 200 });
    expect(panel).toHaveStyle({ left: '660px', top: '16px' });
  });
});

it('shows a separate status bar, updates its contents, and hides it when collapsed', async () => {
  const { rerender } = render(
    <ToolWindow title="Developer tools" status="12 entities loaded.">
      Controls
    </ToolWindow>
  );
  const status = screen.getByText('12 entities loaded.');
  fireEvent.click(screen.getByRole('button', { name: 'Expand developer tools' }));
  expect(status.tagName).toBe('FOOTER');
  expect(status.previousElementSibling).toHaveTextContent('Controls');
  rerender(
    <ToolWindow title="Developer tools" status="13 entities loaded.">
      Controls
    </ToolWindow>
  );
  expect(screen.getByText('13 entities loaded.')).toBeVisible();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Collapse developer tools' }));
  expect(screen.getByText('13 entities loaded.')).not.toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Expand developer tools' }));
  expect(screen.getByText('13 entities loaded.')).toBeVisible();
});
