import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { CardVoceServizio } from './CardVoceServizio';
import { EmptyState } from './EmptyState';
import { FormVoceServizio } from './FormVoceServizio';
import { LIMITE_VOCI, TIPI_VOCE } from '@/servizi/offerta-ricerca';
import { space } from '@/theme/tokens';

/**
 * Le due sezioni di «Offro e cerco», con le stesse parole della registrazione.
 * Vivono qui, accanto al componente che le disegna: la schermata le importa e le
 * scorre, senza ricopiare i testi.
 */
export const SEZIONI_PUBBLICAZIONI = [
  {
    chiave: 'offerte',
    tipo: TIPI_VOCE.OFFERTA,
    titolo: 'Cosa offro',
    spiegazione:
      'Sono i servizi che sai fare: con la categoria giusta gli altri ti trovano nella home e nello swipe.',
    etichettaAggiungi: "Aggiungi un'offerta",
    testoLimite: `Hai raggiunto il massimo di ${LIMITE_VOCI} offerte.`,
    vuoto: {
      icona: 'pricetags-outline',
      titolo: 'Non hai pubblicato nessuna offerta',
      descrizione:
        'Un\'offerta è un servizio che sai fare: con la categoria giusta gli altri ti trovano nella home e nello swipe. Tocca «Aggiungi» per pubblicarne una.',
    },
  },
  {
    chiave: 'ricerche',
    tipo: TIPI_VOCE.RICERCA,
    titolo: 'Cosa cerco',
    spiegazione: 'Sono le cose che ti servono: dicono al sistema chi può scambiare con te.',
    etichettaAggiungi: 'Aggiungi una ricerca',
    testoLimite: `Hai raggiunto il massimo di ${LIMITE_VOCI} ricerche.`,
    vuoto: {
      icona: 'help-circle-outline',
      titolo: 'Non hai pubblicato nessuna ricerca',
      descrizione:
        'Una ricerca dice cosa ti serve: è quello che permette al sistema di trovare chi può scambiare con te. Tocca «Aggiungi» per pubblicarne una.',
    },
  },
];

/**
 * Una delle due sezioni di «Offro e cerco»: intestazione con il conteggio,
 * «Aggiungi», il form di pubblicazione quando è il turno di questo tipo, le card
 * delle voci già pubblicate e lo stato vuoto.
 *
 * Vive fuori dalla schermata perché la schermata andava oltre la soglia di righe
 * indicata dalle regole del progetto, e perché la useranno anche la home («le
 * mie pubblicazioni») e il Profilo. Nessuno stato proprio: tutto arriva dalla
 * schermata, che è l'unica a sapere cosa sta pubblicando.
 */
export function SezionePubblicazioni({
  sezione,
  voci,
  categorie,
  statoCategorie,
  form,
  fieldErrors,
  erroreForm,
  categoriePronte,
  salvataggio,
  azioneInCorso,
  onApriNuova,
  onCambiaCampo,
  onSalva,
  onAnnullaForm,
  onModifica,
  onCambiaStato,
  onElimina,
}) {
  const pieno = voci.length >= LIMITE_VOCI;
  const formQui = form !== null && form.tipo === sezione.tipo;

  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.sm,
            flexWrap: 'wrap',
          }}
        >
          <AppText variant="heading">{sezione.titolo}</AppText>
          <AppText variant="small" tone="secondary">{`${voci.length} di ${LIMITE_VOCI}`}</AppText>
        </View>
        <AppText variant="small" tone="secondary">
          {sezione.spiegazione}
        </AppText>
        {/* Il pulsante non sparisce mai al limite: un comando che scompare fa
            credere che la funzione sia rotta. */}
        <AppButton
          label="Aggiungi"
          variant="secondary"
          icon="add-outline"
          disabled={pieno || !categoriePronte}
          onPress={onApriNuova}
          accessibilityLabel={sezione.etichettaAggiungi}
          style={{ alignSelf: 'flex-start' }}
        />
        {pieno ? (
          <AppText variant="small" tone="secondary">
            {sezione.testoLimite}
          </AppText>
        ) : null}
        {categoriePronte ? null : (
          <AppText variant="small" tone="secondary">
            Le categorie non sono disponibili: pubblicare e modificare sono disabilitati.
          </AppText>
        )}
      </View>

      {formQui ? (
        <FormVoceServizio
          tipo={sezione.tipo}
          voce={form.voce}
          categorie={categorie}
          statoCategorie={statoCategorie}
          fieldErrors={fieldErrors}
          errore={erroreForm}
          categoriePronte={categoriePronte}
          salvataggio={salvataggio}
          onCambia={onCambiaCampo}
          onSalva={onSalva}
          onAnnulla={onAnnullaForm}
        />
      ) : null}

      {/* La voce in modifica è nascosta dall'elenco: non si vede due volte. */}
      {voci.map((voce) =>
        formQui && form.voce.chiave === voce.chiave ? null : (
          <CardVoceServizio
            key={voce.chiave}
            voce={voce}
            categorie={categorie}
            azioneInCorso={
              azioneInCorso && azioneInCorso.id === voce.id ? azioneInCorso.nome : null
            }
            disabilitato={!categoriePronte}
            onModifica={onModifica}
            onCambiaStato={onCambiaStato}
            onElimina={onElimina}
          />
        ),
      )}

      {/* Con un errore a schermo lo stato vuoto sarebbe fuorviante: c'è il Banner. */}
      {voci.length === 0 && !formQui ? (
        <EmptyState
          icon={sezione.vuoto.icona}
          title={sezione.vuoto.titolo}
          description={sezione.vuoto.descrizione}
        />
      ) : null}
    </View>
  );
}
