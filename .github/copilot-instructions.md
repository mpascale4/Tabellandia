# GitHub Copilot – Istruzioni per il progetto

## Accessibility Quick Rules

Quando generi o modifichi codice:

- Rispetta sempre **WCAG 2.2 AA** e **WAI-ARIA APG**.
- Garantire navigazione da tastiera, screen reader, contrasto alto e supporto al reduced motion.
- Non usare il colore come unico veicolo informativo.
- Evitare animazioni lampeggianti, strobo o distrazioni.
- Usare HTML semantico, ARIA valido e focus visibile.
- Mantenere leggibilità anche in grayscale e nei temi chiaro/scuro.
- Verificare il risultato con **Lighthouse a11y >= 95** e senza critical axe-core issues.

---

## Flusso Git obbligatorio (Git Flow)

**Prima di qualsiasi modifica al codice:**
1. Aprire una nuova feature con Git Flow:
   ```bash
   git flow feature start <nome-feature>
   ```

**Al termine di tutte le modifiche:**
2. Chiudere la feature e fare la push:
   ```bash
   git flow feature finish <nome-feature>
   git push origin develop
   git push origin --tags
   ```

> ⚠️ Non eseguire mai commit direttamente su `main` o `develop` senza passare per una feature branch di Git Flow.

---

## Comandi personalizzati

Quando l'utente scrive `/pull` o `#pull`, esegui immediatamente i seguenti comandi nell'ordine indicato, senza chiedere conferma:

```powershell
git pull origin develop
git pull origin main
```

Se sono presenti branch locali attivi (feature branch), esegui anche:

```powershell
git pull origin <branch-corrente>
```

> ℹ️ Usa `git branch --show-current` per determinare il branch corrente prima di eseguire il pull.

---

## Flusso iniziale dell'app

- La prima vista dell'app deve essere sempre la **selezione del profilo**.
- Non introdurre schermate di benvenuto, intro o bypass iniziali prima del profile picker.
- Se il flusso di apertura cambia, il picker profilo resta comunque la prima schermata visibile.

---

## Accessibility Standards

Le quick rules sopra sono vincolanti. In caso di dubbio, applica sempre:

- WCAG 2.2 AA e WAI-ARIA APG
- contrasto corretto in tutti i temi e in grayscale
- navigazione da tastiera, screen reader e focus visibile
- supporto a prefers-reduced-motion senza flash, strobo o animazioni distraenti
- HTML semantico, ARIA valido, niente colore come unico canale informativo
- Lighthouse accessibility >= 95 e nessun critical axe-core issue


---

## Regole di qualità del codice

Quando generi o modifichi codice, applica sempre queste regole.
Le regole valgono per tutto il codice del progetto (esistente e nuovo): ogni refactor deve preservare comportamento, funzionalita e requisiti di accessibilita.

### 1) Minimizzare il codice (senza perdere chiarezza)

- Preferisci soluzioni semplici e leggibili rispetto a implementazioni complesse.
- Riduci duplicazioni, rami condizionali inutili e codice morto.
- Evita astrazioni premature: introducile solo quando servono davvero.
- Mantieni funzioni e componenti piccoli, con una singola responsabilità.

### 2) Fattorizzare in modo corretto

- Applica il principio **DRY**: estrai logica condivisa in utility, hook o moduli riusabili.
- Centralizza costanti, tipi e configurazioni per evitare incoerenze.
- Se una logica e ripetuta 2+ volte, valuta l'estrazione in una funzione dedicata.
- Mantieni interfacce semplici e nomi espliciti per favorire manutenzione e riuso.

### 3) Ingegnerizzare con approccio solido

- Progetta per estendibilita e testabilita (moduli coesi, dipendenze ridotte).
- Definisci contratti chiari tra componenti (tipi, input/output, gestione errori).
- Gestisci errori e stati limite in modo esplicito, evitando comportamenti impliciti.
- Ottimizza solo dove necessario, dopo aver verificato il collo di bottiglia.

### 4) Applicare best practice

- Segui i principi **SOLID**, **KISS**, **YAGNI** e le convenzioni del progetto.
- Usa nomi chiari e consistenti; evita abbreviazioni ambigue.
- Scrivi o aggiorna test per logica critica e regressioni.
- Mantieni lint, typecheck e test verdi prima di finalizzare le modifiche.
- Documenta decisioni non ovvie con commenti brevi e mirati.


---

## Layout Consistency Rules (Mandatory)

Queste regole sono vincolanti e devono essere applicate in tutto il progetto per garantire consistenza visiva, accessibilità e manutenibilità.

### Principi generali

- Utilizzare sempre gli stessi pattern di layout per la stessa tipologia di contenuto.
- Non introdurre layout alternativi se esiste già un pattern equivalente nel progetto.
- Prima di creare una nuova struttura, cercare e riutilizzare la soluzione già presente nel codebase.
- Privilegiare la coerenza rispetto alle preferenze personali o alle alternative tecnicamente equivalenti.

---

### Gerarchia dei sistemi di layout

Ordine di preferenza:

1. Componenti condivisi del Design System
2. CSS Grid
3. Flexbox
4. HTML semantico nativo

Se più soluzioni sono possibili, utilizzare sempre quella con priorità più alta.

---

### Utilizzo di CSS Grid

CSS Grid è il sistema di layout predefinito dell'applicazione.

Utilizzare Grid per:

- dashboard
- card
- widget
- gallerie
- raccolte di elementi
- risultati di ricerca
- cataloghi
- elenchi visuali
- pannelli responsive

Pattern standard:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
</div>
```

---

## Regola griglia adattiva (Mandatory)

Quando le card si impilano verticalmente invece di distribuirsi su più colonne:

1. **Individua il padre**: cerca `grid-cols-1` o `flex-col` che forza il layout in colonna singola.
2. **Non usare `w-full` o `flex: 1` sulle card**: lasciar dimensionare il browser in base al contenuto.
3. **Usa sempre `auto-fit/minmax`** per griglie di card/elementi visuali:

```tsx
// ✅ Corretto — si adatta allo spazio disponibile
<div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">

// ❌ Sbagliato — forza una colonna su mobile
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
```

4. **Non aggiungere `width: 100%` o `flex: 1` sulle card** al di fuori di un contesto dove il genitore ha altezza/larghezza definita.
5. Se la griglia non si espande, verifica che il padre non abbia `flex-col`, `w-fit`, `max-w` troppo restrittivo o `overflow: hidden` che limitino il contenuto.

### Liste in layout card/grid (Mandatory)

- Non usare `<ul>`/`<li>` per layout visuali a card o sezioni tecniche informative.
- Usa sempre `<div role="list">` come contenitore e `<div role="listitem">` per gli elementi.
- Anche quando la lista è verticale, mantieni pattern grid: `grid grid-cols-1`.
- Per liste card responsive usa `grid-cols-[repeat(auto-fit,minmax(...))]`.
- Mantieni semantica accessibile tramite ruoli ARIA (`role="list"`, `role="listitem"`).

---

## Badge di stato (Mandatory)

I badge di stato devono essere **visualmente uniformi** in tutto il progetto.

### Badge check (completato/selezionato)

Usa sempre questo pattern:

```tsx
<span
  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] font-black shadow-md"
  aria-hidden="true"
>
  ✓
</span>
```

### Badge lucchetto (bloccato)

Usa sempre questo pattern:

```tsx
<span
  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-md"
  aria-hidden="true"
>
  🔒
</span>
```

### Regole

- Dimensione fissa: `h-5 w-5`
- Posizione fissa: `absolute -top-1 -right-1`
- Forma: `rounded-full`
- Check: sfondo verde (`bg-emerald-500`), testo bianco, bordo bianco
- Lucchetto: sfondo bianco, bordo slate, emoji `🔒`
- Sempre `aria-hidden="true"` (informazione trasmessa anche da colore/testo)
- Non usare `✅` nei badge di stato su card (solo nei testi descrittivi)
