import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { radius, space, useTokens } from '@/theme/tokens';

const ICONS = {
  error: 'alert-circle-outline',
  success: 'checkmark-circle-outline',
  info: 'information-circle-outline',
};

/**
 * Avviso a banner: usato per errori delle API, conferme e note.
 * Con `etichettaAzione` + `onAzione` porta dentro di sé la AppButton secondaria:
 * lo stesso gesto d'errore è un solo elemento, non banner e bottone separato.
 * `caricamentoAzione` spegne il comando mentre l'azione è in volo;
 * `iconaAzione` cambia il simbolo del comando (il default è «Riprova», perché
 * il primo uso del banner è stato un errore con ritentativo).
 */
export function Banner({
  kind,
  message,
  etichettaAzione = null,
  onAzione = null,
  caricamentoAzione = false,
  iconaAzione = 'refresh-outline',
}) {
  const t = useTokens();
  const palettes = {
    error: { bg: t.dangerBg, text: t.dangerText, border: t.danger },
    success: { bg: t.successBg, text: t.successText, border: t.successText },
    info: { bg: t.serviceBg, text: t.serviceText, border: t.serviceText },
  };
  const palette = palettes[kind];
  const stileAzione = { marginTop: space.xs, alignSelf: 'flex-start' };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        gap: space.sm,
        alignItems: 'flex-start',
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: radius.input,
        padding: space.md,
      }}
    >
      <AppIcon name={ICONS[kind]} size={18} color={palette.text} style={{ marginTop: 1 }} />
      <AppText variant="small" style={{ color: palette.text, flex: 1 }}>
        {message}
      </AppText>
      {etichettaAzione && onAzione ? (
        <AppButton
          label={etichettaAzione}
          variant="secondary"
          icon={iconaAzione}
          onPress={onAzione}
          loading={caricamentoAzione}
          style={stileAzione}
        />
      ) : null}
    </View>
  );
}
