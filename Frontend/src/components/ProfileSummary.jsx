import { useState } from 'react';
import { Image, View } from 'react-native';
import { AppIcon } from '@/components/AppIcon';
import { AppText } from '@/components/AppText';
import { localitaPerDisplay } from '@/services/italian-locations';
import { radius, space, useTokens } from '@/theme/tokens';

/** Same disc as the own-profile screen: the two identity blocks are one shape. */
const AVATAR = 84;

/**
 * The identity of another person, drawn from the `user` envelope the public
 * profile endpoint already normalises (`normalizeUserServices().utente`):
 * `{id, username, nome, cognome, localita, bio, immagineProfilo}`.
 *
 * Data only: the summary never asks the network for anything and owns no
 * loading state, so the screen above it decides what to do with a request in
 * flight. A field the person left empty has no line at all — «Bio non indicata»
 * would be a sentence the person never said, and the reader cannot tell the
 * difference from something the app filled in.
 *
 * The photo follows the rule of the own-profile screen: it is drawn when it
 * loads, and when it does not the initials stay in the circle and one prose
 * line says the image is broken, instead of a blank disc that looks like a
 * loading bug.
 */
export function ProfileSummary({ utente }) {
  const t = useTokens();
  // The normaliser answers `null` for an empty field; both `null` and a missing
  // key mean "no line", so every read below lands on `null` instead of
  // `undefined`, which would render as an empty line.
  const name = utente?.nome ?? null;
  const surname = utente?.cognome ?? null;
  const username = utente?.username ?? null;
  // The location is drawn the way every other screen draws it (`Comune - Provincia`),
  // so one person's place reads the same on the card, in the detail and here.
  const location = utente?.localita ?? null;
  const bio = utente?.bio ?? null;
  const photo = utente?.immagineProfilo ?? null;
  // The photo URL may point at nothing: an explicit state says so. The state is
  // the *address* that failed, not a boolean, so a screen that moves to another
  // person does not carry the previous person's broken photo with it.
  const [fotoRotta, setFotoRotta] = useState(null);

  const composedName = [name, surname].filter(Boolean).join(' ') || null;
  // Without a name the username takes its place; without either, the initials
  // fall back to the first letter of the username, then to a bare placeholder,
  // so the circle is never empty.
  const displayName = composedName ?? (username !== null ? `@${username}` : null);
  const initials =
    `${name?.charAt(0) ?? ''}${surname?.charAt(0) ?? ''}`.toUpperCase() ||
    (username?.charAt(0) ?? '').toUpperCase() ||
    '?';
  const photoBroken = photo !== null && fotoRotta === photo;
  const showPhoto = photo !== null && !photoBroken;

  return (
    <View style={{ gap: space.md }}>
      <View style={{ alignItems: 'center', gap: space.md }}>
        {showPhoto ? (
          <Image
            source={{ uri: photo }}
            accessibilityLabel="Immagine del profilo"
            onError={() => setFotoRotta(photo)}
            style={{ width: AVATAR, height: AVATAR, borderRadius: radius.pill }}
          />
        ) : (
          <View
            style={{
              width: AVATAR,
              height: AVATAR,
              borderRadius: radius.pill,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* The initials say who this is; the name below is the heading. */}
            <AppText variant="title" tone="primary" accessibilityRole="text">
              {initials}
            </AppText>
          </View>
        )}

        {photo !== null && photoBroken ? (
          <AppText variant="label" tone="danger" style={{ textAlign: 'center' }}>
            L&apos;immagine del profilo non si carica.
          </AppText>
        ) : null}

        {displayName !== null ? <AppText variant="heading">{displayName}</AppText> : null}
        {/* The second line is the username *unless* the first line already is
            it: a person with no name would otherwise read `@marco.rossi` twice. */}
        {username !== null && composedName !== null ? (
          <AppText variant="small" tone="secondary">
            @{username}
          </AppText>
        ) : null}
      </View>

      {location !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <AppIcon name="location-outline" size={16} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {localitaPerDisplay(location)}
          </AppText>
        </View>
      ) : null}

      {bio !== null ? <AppText variant="body">{bio}</AppText> : null}
    </View>
  );
}
