import { useEffect } from 'react';
import { View } from 'react-native';
import { act, create } from 'react-test-renderer';

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

/** Renders the boundary around `child` with every update inside act. */
function renderBounded(child) {
  let renderer;
  act(() => {
    renderer = create(<AppErrorBoundary>{child}</AppErrorBoundary>);
  });
  return renderer;
}

/** How many nodes carry the recovered child's label (composite + host). */
function recoveredCount(renderer) {
  return renderer.root.findAll((node) => node.props?.accessibilityLabel === 'recovered')
    .length;
}

/** The control carrying this accessibility label, pressed the way a tap would. */
function press(renderer, accessibilityLabel) {
  const control = renderer.root
    .findAll(
      (node) =>
        node.props?.accessibilityLabel === accessibilityLabel &&
        typeof node.props.onPress === 'function',
    )
    .at(0);
  expect(control).toBeDefined();
  act(() => {
    control.props.onPress();
  });
}

describe('AppErrorBoundary fallback', () => {
  it('shows the Italian fallback with an alert role instead of a blank tree when a child throws', () => {
    const renderer = renderBounded(<Exploding />);

    const json = renderer.toJSON();
    expect(json).not.toBeNull();
    const rendered = JSON.stringify(json);
    expect(rendered).toContain('Qualcosa non ha funzionato');
    expect(rendered).toContain('Riprova');
    expect(rendered).toContain('Torna ai servizi');

    const alerts = renderer.root.findAll((node) => node.props?.accessibilityRole === 'alert');
    expect(alerts.length).toBeGreaterThan(0);

    // The boundary logs in dev, and __DEV__ is true under jest.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unhandled render error',
      expect.any(Error),
      expect.anything(),
    );
  });

  it('remounts the children on Riprova after a crash that happened once they were mounted', () => {
    const renderer = renderBounded(<Gated />);
    expect(recoveredCount(renderer)).toBeGreaterThan(0);
    expect(mounts).toHaveLength(1);

    // A crash on a later render: the mounted child is torn down and replaced.
    shouldCrash = true;
    act(() => {
      renderer.update(
        <AppErrorBoundary>
          <Gated />
        </AppErrorBoundary>,
      );
    });
    expect(recoveredCount(renderer)).toBe(0);
    expect(mounts).toHaveLength(1);

    // The condition is gone: a retry brings the children back as a fresh mount.
    shouldCrash = false;
    press(renderer, 'Riprova');

    expect(recoveredCount(renderer)).toBeGreaterThan(0);
    expect(mounts).toHaveLength(2);
  });

  it('navigates to the services home when Torna ai servizi is pressed', () => {
    const renderer = renderBounded(<Exploding />);

    press(renderer, 'Torna ai servizi');

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('never puts the error message or the stack on screen', () => {
    const renderer = renderBounded(<Exploding />);

    expect(JSON.stringify(renderer.toJSON())).not.toContain('boom');
  });
});
