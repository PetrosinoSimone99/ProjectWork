import { useEffect } from 'react';
import { View } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppErrorBoundary } from '../AppErrorBoundary';

const mockRouter = { replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

/** A child that always throws, so the boundary has something to catch. */
function Exploding() {
  throw new Error('boom');
}

// React replays a render that throws, so "throw on the first attempt" is not a
// crash the boundary ever sees: the gate has to be a condition, not a counter.
let shouldCrash = false;
const mounts = [];

function Gated() {
  if (shouldCrash) {
    throw new Error('boom');
  }
  return <Stable />;
}

/** Records its own mounts: a second mount is how a retry proves it remounted
 * the children instead of repainting the tree it already had. */
function Stable() {
  useEffect(() => {
    mounts.push('Stable');
  }, []);
  return <View accessibilityLabel="recovered" />;
}

let consoleErrorSpy;

beforeEach(() => {
  // React and the boundary both log through console.error: keep the output
  // quiet but record the calls so the test can assert on them.
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockRouter.replace.mockClear();
  shouldCrash = false;
  mounts.length = 0;
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

/** Mounts the boundary around `child`; from RTL 14 the mount is awaited. */
async function renderBounded(child) {
  return await render(<AppErrorBoundary>{child}</AppErrorBoundary>);
}

/** How many nodes carry the recovered child's label (RTL 14 keeps host nodes only). */
function recoveredCount() {
  return screen.container.queryAll((nodo) => nodo.props?.accessibilityLabel === 'recovered')
    .length;
}

/** The control carrying this accessibility label, pressed the way a tap would. */
async function press(accessibilityLabel) {
  const control = screen.getAllByRole('button', { name: accessibilityLabel }).at(0);
  expect(control).toBeDefined();
  await fireEvent.press(control);
}

describe('AppErrorBoundary fallback', () => {
  it('shows the Italian fallback with an alert role instead of a blank tree when a child throws', async () => {
    await renderBounded(<Exploding />);

    const json = screen.toJSON();
    expect(json).not.toBeNull();
    const rendered = JSON.stringify(json);
    expect(rendered).toContain('Qualcosa non ha funzionato');
    expect(rendered).toContain('Riprova');
    expect(rendered).toContain('Torna ai servizi');

    const alerts = screen.container.queryAll((nodo) => nodo.props?.accessibilityRole === 'alert');
    expect(alerts.length).toBeGreaterThan(0);

    // The boundary logs in dev, and __DEV__ is true under jest.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unhandled render error',
      expect.any(Error),
      expect.anything(),
    );
  });

  it('remounts the children on Riprova after a crash that happened once they were mounted', async () => {
    const { rerender } = await renderBounded(<Gated />);
    expect(recoveredCount()).toBeGreaterThan(0);
    expect(mounts).toHaveLength(1);

    // A crash on a later render: the mounted child is torn down and replaced.
    shouldCrash = true;
    await rerender(
      <AppErrorBoundary>
        <Gated />
      </AppErrorBoundary>,
    );
    expect(recoveredCount()).toBe(0);
    expect(mounts).toHaveLength(1);

    // The condition is gone: a retry brings the children back as a fresh mount.
    shouldCrash = false;
    await press('Riprova');

    expect(recoveredCount()).toBeGreaterThan(0);
    expect(mounts).toHaveLength(2);
  });

  it('navigates to the services home when Torna ai servizi is pressed', async () => {
    await renderBounded(<Exploding />);

    await press('Torna ai servizi');

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('never puts the error message or the stack on screen', async () => {
    await renderBounded(<Exploding />);

    expect(JSON.stringify(screen.toJSON())).not.toContain('boom');
  });
});
