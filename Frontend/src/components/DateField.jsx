import { createElement, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { AppButton } from './AppButton';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { dateFromIsoDate, formatIsoDateNumeric, isoDateFromDate } from '@/services/dates';
import { radius, space, useTokens } from '@/theme/tokens';

/** The one shape the reader sees when the field has no day yet. */
const SEGNAPOSTO = 'GG/MM/AAAA';

/**
 * One calendar day, entered with the platform's own control instead of being
 * typed by hand.
 *
 * This component is the boundary and nothing else: `valore` arrives as an ISO
 * calendar day (`YYYY-MM-DD`, `''` when empty) and leaves through `onCambia`
 * the same way, so the sheet's state, `periodoValido` and the wire never see a
 * `Date` or a localised string. The conversions are pure and live in
 * `services/dates.js`.
 *
 * - Web: a real `input[type=date]`, built inside this branch and therefore
 *   never mounted on native. It brings the browser picker, the `gg/mm/aaaa`
 *   skeleton and the keyboard handling for free; its `aria-label` is the row's
 *   label, so the field keeps a name a screen reader can announce.
 * - Native: a `Pressable` row showing `GG/MM/AAAA` that mounts
 *   `@expo/ui/community/datetime-picker` on press. Android's
 *   `presentation="dialog"` opens on mount and answers `onValueChange` on
 *   confirmation or `onDismiss` on cancel, so the picker is unmounted on
 *   either; iOS ignores the prop and draws the picker inline, so there the row
 *   also offers `Fatto` to unmount it once the wheel is where the reader wants
 *   it.
 *
 * `disabled` mirrors the sheet's busy state: the row keeps its place and its
 * label, it just refuses the press.
 */
export function DateField({ etichetta, valore, onCambia, disabled = false }) {
  const t = useTokens();
  // Only the native branch needs it; the hook stays above the web return so the
  // hook order is the same on both platforms.
  const [pickerAperto, setPickerAperto] = useState(false);
  const visualizzato = formatIsoDateNumeric(valore);

  /** One `Date` from the picker, back to the ISO day the boundary speaks. */
  function scegli(data) {
    const iso = isoDateFromDate(data);
    if (iso !== null) {
      onCambia(iso);
    }
  }

  if (Platform.OS === 'web') {
    return (
      <View style={{ gap: space.xs }}>
        <AppText variant="label">{etichetta}</AppText>
        {createElement('input', {
          type: 'date',
          value: valore,
          disabled,
          'aria-label': etichetta,
          onChange: (evento) => onCambia(evento.target.value),
          style: {
            boxSizing: 'border-box',
            width: '100%',
            minHeight: 44,
            paddingLeft: space.sm,
            paddingRight: space.sm,
            fontFamily: 'inherit',
            fontSize: 16,
            color: disabled ? t.textSecondary : t.text,
            backgroundColor: t.background,
            border: `1px solid ${t.borderInput}`,
            borderRadius: radius.input,
          },
        })}
      </View>
    );
  }

  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="label">{etichetta}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={etichetta}
        accessibilityValue={{ text: visualizzato === '' ? SEGNAPOSTO : visualizzato }}
        accessibilityState={{ disabled }}
        aria-disabled={disabled}
        disabled={disabled}
        onPress={() => setPickerAperto(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.xs,
          minHeight: 44,
          paddingHorizontal: space.sm,
          borderWidth: 1,
          borderColor: pressed ? t.primary : t.borderInput,
          borderRadius: radius.input,
          backgroundColor: t.background,
          opacity: disabled ? 0.6 : 1,
        })}
      >
        <AppText variant="small" tone={visualizzato === '' ? 'secondary' : undefined}>
          {visualizzato === '' ? SEGNAPOSTO : visualizzato}
        </AppText>
        <AppIcon name="calendar-outline" size={16} color={t.textSecondary} />
      </Pressable>

      {pickerAperto ? (
        <View style={{ gap: space.xs }}>
          <DateTimePicker
            // `value` is required and controlled; noon keeps the day stable
            // under daylight saving, and an empty field starts from today
            // instead of 1 January 1970.
            value={dateFromIsoDate(valore) ?? new Date()}
            mode="date"
            display="default"
            presentation="dialog"
            locale="it_IT"
            positiveButton={{ label: 'Scegli' }}
            negativeButton={{ label: 'Annulla' }}
            onValueChange={(_evento, data) => {
              scegli(data);
              setPickerAperto(false);
            }}
            onDismiss={() => setPickerAperto(false)}
          />
          {Platform.OS === 'ios' ? (
            <AppButton label="Fatto" variant="secondary" onPress={() => setPickerAperto(false)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
