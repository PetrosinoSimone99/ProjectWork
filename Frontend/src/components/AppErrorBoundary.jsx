import { Component, Fragment } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { space, useTokens } from '@/theme/tokens';

/** A render throw would otherwise unmount the tree and leave a blank screen. */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (__DEV__) {
      console.error('Unhandled render error', error, info);
    }
  }

  reset = () => this.setState((prev) => ({ error: null, retryKey: prev.retryKey + 1 }));

  render() {
    if (this.state.error) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    // A new key remounts the children, so a retry re-runs the render that threw.
    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
  }
}

function ErrorFallback({ onRetry }) {
  const t = useTokens();
  const router = useRouter();
  // onRetry first: navigating with a live error would repaint the fallback on the new screen.
  const handleHome = () => {
    onRetry();
    router.replace('/');
  };

  return (
    <View
      accessibilityRole="alert"
      style={{
        flex: 1,
        backgroundColor: t.background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space.xl,
        gap: space.md,
      }}
    >
      <AppText variant="title">Qualcosa non ha funzionato</AppText>
      <AppText variant="body" tone="secondary">
        La pagina non è riuscita a caricarsi. Puoi riprovare, oppure tornare ai servizi.
      </AppText>
      <AppButton label="Riprova" onPress={onRetry} />
      <AppButton label="Torna ai servizi" variant="secondary" onPress={handleHome} />
    </View>
  );
}
