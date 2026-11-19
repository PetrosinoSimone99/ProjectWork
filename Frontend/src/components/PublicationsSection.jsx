import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { EntryCard } from './EntryCard';
import { EmptyState } from './EmptyState';
import { EntryForm } from './EntryForm';
import {
  TIPI_VOCE,
  limiteRaggiunto,
  testoConteggioVoci,
  testoLimiteVoci,
} from '@/services/offer-request';
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
      'Sono i servizi che sai fare: con la categoria giusta gli altri ti trovano nella home.',
    etichettaAggiungi: "Aggiungi un'offerta",
    vuoto: {
      icona: 'pricetags-outline',
      titolo: 'Non hai pubblicato nessuna offerta',
      descrizione: 'Seleziona «Aggiungi» per iniziare.',
    },
  },
  {
    chiave: 'ricerche',
    tipo: TIPI_VOCE.RICERCA,
    titolo: 'Cosa cerco',
    spiegazione: 'Sono le cose che ti servono: dicono al sistema chi può scambiare con te.',
    etichettaAggiungi: 'Aggiungi una ricerca',
    vuoto: {
      icona: 'help-circle-outline',
      titolo: 'Non hai pubblicato nessuna ricerca',
      descrizione: 'Seleziona «Aggiungi» per iniziare.',
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
 *
 * `scritturaInCorso` è `false` finché nessuna scrittura è in volo, `true` mentre
 * lo è (salvataggio di una voce): con `true` la sezione non apre un form nuovo,
 * lascia leggere il form aperto senza poterlo salvare o annullare e spegne
 * «Modifica» sulle card. Il blocco è uno solo per la schermata, così due
 * scritture non possono incrociarsi. Le card ricevono i due motivi separati:
 * `modificaDisabilitata` per le categorie mancanti, `azioniDisabilitate` per la
 * scrittura in volo.
 */
export function PublicationsSection({
  sezione,
  voci,
  categorie,
  statoCategorie,
  errore,
  form,
  fieldErrors,
  erroreForm,
  categoriePronte,
  salvataggio,
  scritturaInCorso = false,
  onApriNuova,
  onCambiaCampo,
  onSalva,
  onAnnullaForm,
  onModifica,
}) {
  const pieno = limiteRaggiunto(voci);
  // Il conteggio restituisce '' quando il numero non dice niente (sotto il tetto
  // e al tetto, dove parlano lo stato vuoto e la frase del limite): qui non si
  // disegna nessuna riga, perché una riga vuota accanto al titolo è peggio di
  // nessuna riga.
  const conteggio = testoConteggioVoci(voci);
  const formQui = form !== null && form.tipo === sezione.tipo;
  // La voce in modifica è nascosta dall'elenco: non si vede due volte.
  const vociDaElencare = voci.filter(
    (voce) => !(formQui && form.voce.chiave === voce.chiave),
  );
  // Un solo pulsante primario a schermata: il primo «+ Aggiungi» resta il
  // comando forte, l'altro diventa secondario (audit UX F08).
  const varianteAggiungi = sezione.tipo === TIPI_VOCE.OFFERTA ? 'primary' : 'secondary';
  const scritturaInVolo = scritturaInCorso === true;

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
          {conteggio ? (
            <AppText variant="small" tone="secondary">{conteggio}</AppText>
          ) : null}
        </View>
        <AppText variant="small" tone="secondary">
          {sezione.spiegazione}
        </AppText>
        {/* Il comando per aggiungere sparisce quando la voce del tipo c'è
            (regola di prodotto: una per tipo). Resta primario solo nella prima
            sezione, perché su una schermata un solo comando è il più forte. Con
            le categorie non pronte il comando resta a schermo e spento, perché
            lì il motivo è temporaneo e va detto; lo stesso vale mentre una
            scrittura è in volo, così non se ne apre una seconda. */}
        {pieno ? null : (
          <AppButton
            label="Aggiungi"
            icon="add"
            variant={varianteAggiungi}
            disabled={!categoriePronte || scritturaInVolo}
            onPress={onApriNuova}
            accessibilityLabel={sezione.etichettaAggiungi}
            style={{ alignSelf: 'flex-start' }}
          />
        )}
        {pieno ? (
          <AppText variant="small" tone="secondary">
            {/* Il conteggio può superare il tetto (voci pubblicate prima del
                limite o da un altro percorso): la frase parte dal numero che
                l'utente ha davanti, non dalla costante (audit F92), e prende il
                sostantivo dal tipo perché il tetto è di una voce per tipo. */}
            {testoLimiteVoci(voci, sezione.tipo)}
          </AppText>
        ) : null}
        {categoriePronte ? null : (
          <AppText variant="small" tone="secondary">
            Le categorie non sono disponibili: pubblicare e modificare sono disabilitati.
          </AppText>
        )}
      </View>

      {formQui ? (
        <EntryForm
          tipo={sezione.tipo}
          voce={form.voce}
          categorie={categorie}
          statoCategorie={statoCategorie}
          fieldErrors={fieldErrors}
          errore={erroreForm}
          categoriePronte={categoriePronte}
          salvataggio={salvataggio}
          bloccato={scritturaInVolo}
          onCambia={onCambiaCampo}
          onSalva={onSalva}
          onAnnulla={onAnnullaForm}
        />
      ) : null}

      {/* Le voci pubblicate sono una lista programmabile (WCAG 1.3.1): ruolo
          `list` sul contenitore e `listitem` su ogni card (audit UX F19). */}
      {vociDaElencare.length > 0 ? (
        <View accessibilityRole="list" style={{ gap: space.md }}>
          {vociDaElencare.map((voce) => (
            <View key={voce.chiave} accessibilityRole="listitem">
              <EntryCard
                voce={voce}
                categorie={categorie}
                modificaDisabilitata={!categoriePronte}
                azioniDisabilitate={scritturaInVolo}
                onModifica={onModifica}
              />
            </View>
          ))}
        </View>
      ) : null}

      {/* Con un errore a schermo lo stato vuoto sarebbe fuorviante: c'è il Banner,
          e la sezione riceve l'errore per poterlo rispettare (audit F56). */}
      {voci.length === 0 && !formQui && !errore ? (
        <EmptyState
          icon={sezione.vuoto.icona}
          title={sezione.vuoto.titolo}
          description={sezione.vuoto.descrizione}
        />
      ) : null}
    </View>
  );
}
