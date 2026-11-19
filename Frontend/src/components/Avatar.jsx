import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '@/components/AppText';
import { radius, useTokens } from '@/theme/tokens';

/** Short enough to read as the disc settling, not as a loading animation. */
const FADE_MS = 150;

/**
 * The one owner of a profile image: the disc is always the same box, and the
 * photo lands inside it.
 *
 * Props — `uri` is the address the person pasted (nothing else: no fallback
 * request, no derived URL); `misura` is the box in px, so every surface states
 * its own size and the decode target follows it; `nome` is what the disc draws
 * when there is no photo — the initials as the profile composes them (name,
 * surname, username, then `?`), because that rule belongs to the profile, not
 * to the image, and re-deriving it from a full name would change it
 * (`Marco Maria Rossi` is `MR`, not `MM`); `onErrore` is the optional hook for
 * the screen that wants to say out loud that the address is broken.
 *
 * The box is sized from `misura` before the image loads and after it fails, so
 * nothing on the screen moves when the photo arrives or never arrives.
 */
export function Avatar({ uri, nome, misura, onErrore }) {
  const t = useTokens();
  // The *address* that failed, not a boolean: a screen that moves to another
  // person must not carry the previous person's broken photo with it.
  const [rotta, setRotta] = useState(null);
  const haIndirizzo = typeof uri === 'string' && uri.trim() !== '';

  if (!haIndirizzo || rotta === uri) {
    return (
      <View
        style={{
          width: misura,
          height: misura,
          borderRadius: radius.pill,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* The initials say who this is; the name below (where there is one) is
            the heading. */}
        <AppText variant="title" tone="primary" accessibilityRole="text">
          {nome}
        </AppText>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      accessibilityLabel="Immagine del profilo"
      // The size is the box, so an arbitrary upload is downscaled to `misura`
      // at decode time instead of being decoded at full resolution.
      style={{ width: misura, height: misura, borderRadius: radius.pill }}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={FADE_MS}
      // The same component can be handed another person's address in place
      // (`/user/7` -> `/user/9`): the old bitmap must not stay under the new one.
      recyclingKey={uri}
      onError={() => {
        setRotta(uri);
        onErrore?.();
      }}
    />
  );
}
