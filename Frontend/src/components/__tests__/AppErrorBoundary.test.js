import { View } from 'react-native';
import { act, create } from 'react-test-renderer';

import { AppErrorBoundary } from '../AppErrorBoundary';

const mockRouter = { replace: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

/** A child that always throws, so the boundary has something to catch. */
function Exploding() {
  throw new Error('boom');
}

/** Fails only on the first render: a retry that remounts it recovers. */
let attempts = 0;
const renderLog = [];
function Flaky() {
  renderLog.push(`before=${attempts}`);
  attempts += 1;
  renderLog.push(`after=${attempts}`);
  if (attempts === 1) {
    throw new Error('boom');
  }
  return <View accessibilityLabel="recovered" />;
}

let consoleErrorSpy;

beforeEach(() => {
  // React and the boundary both log through console.error: keep the output
  // quiet but record the calls so the test can assert on them.
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockRouter.replace.mockClear();
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

  it('remounts the children on Riprova so a first-render failure can recover', () => {
    attempts = 0;
    renderLog.length = 0;
    const renderer = renderBounded(<Flaky />);
    expect(
      renderer.root.findAll((node) => node.props?.accessibilityLabel === 'recovered').length,
    ).toBe(0);

    press(renderer, 'Riprova');

    expect(
      renderer.root.findAll((node) => node.props?.accessibilityLabel === 'recovered').length,
    ).toBe(1);
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
