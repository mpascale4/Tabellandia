---
applyTo: "**/*.ts,**/*.html,**/*.scss"
description: "Best practice per lo sviluppo di progetti Angular (Angular 17+)"
---

# Copilot Instructions – Angular Best Practices

> Riferimento di partenza: Angular Style Guide ufficiale + convenzioni community
> (awesome-copilot, ai-codingrules.com). Adatta i punti a strict/eslint del progetto reale.

## 1. Architettura & Componenti

- Usa **standalone components** di default (niente `NgModule` a meno di reale necessità).
- Imposta sempre `changeDetection: ChangeDetectionStrategy.OnPush`.
- Usa `inject()` per la dependency injection in componenti/servizi/direttive/guardie,
  al posto dell'iniezione via costruttore quando possibile.
- Struttura le feature come **lazy-loaded routes** (`loadComponent` / `loadChildren`).
- Componenti piccoli, con singola responsabilità (smart/container vs dumb/presentational).
- Nomi selettori componenti con prefisso coerente del progetto (es. `app-`, `tbl-`).

## 2. Stato & Reattività

- Preferisci la **Signals API** (`signal`, `computed`, `effect`) per stato locale reattivo.
- Per stato complesso/condiviso cross-feature, usa NgRx (`createFeature`,
  `createActionGroup`) oppure un Signal Store, non stato sparso in servizi ad-hoc.
- Isola side-effect (chiamate HTTP, navigazione, storage) in servizi/effects dedicati,
  mai direttamente nei componenti.
- Evita l'uso improprio di `ngOnInit` per inizializzazioni che possono essere gestite
  con `signal`/`computed` o nel costruttore via `inject()`.

## 3. Template & Control Flow

- Usa il **nuovo control flow** nativo: `@if`, `@for` (con `track`), `@switch` al posto
  di `*ngIf` / `*ngFor` / `*ngSwitch`.
- `@for` richiede sempre una `track` expression esplicita e stabile (es. `track item.id`).
- Evita `[(ngModel)]` in favore di binding espliciti `[value]`/`(input)` o Reactive Forms
  quando serve validazione.
- Mantieni i template leggibili: estrai blocchi condizionali complessi in componenti figli
  o `ng-template` dedicati, evitando annidamenti profondi.

## 4. TypeScript & Qualità del Codice

- `strict: true` in `tsconfig.json`; niente `any` (usa `unknown` + type guard se serve).
- Nomi espliciti e coerenti; niente abbreviazioni ambigue.
- Applica DRY: logica condivisa in servizi/utility/pipe riusabili, non duplicata.
- Gestisci esplicitamente errori e stati limite (loading/error/empty) nei componenti che
  consumano dati asincroni — mai stati impliciti/non gestiti.
- Lint (`eslint`) e typecheck devono essere verdi prima di considerare concluso un task.

## 5. RxJS

- Usa l'`async` pipe nei template al posto di `subscribe()` manuale quando possibile.
- Se sottoscrivi manualmente, gestisci sempre l'unsubscribe (`takeUntilDestroyed()`,
  `DestroyRef`), mai subscription "a perdere".
- Preferisci operatori puri (`map`, `switchMap`, `combineLatest`) a logica imperativa
  dentro le subscription.

## 6. Testing

- Ogni servizio, pipe e componente con logica non banale ha uno unit test (`*.spec.ts`).
- Usa Jest se già configurato nel progetto (altrimenti Jasmine/Karma come da setup esistente
  del repo — non introdurre un nuovo test runner senza necessità).
- I test devono coprire i casi limite (errore, vuoto, loading), non solo il happy path.

## 7. Accessibilità (vincolante, coerente con le regole WCAG 2.2 AA del progetto)

- HTML semantico nei template Angular; ARIA valido solo dove il semantico nativo non basta.
- Navigazione da tastiera e focus visibile su tutti gli elementi interattivi
  (bottoni, link, controlli custom con `cdkFocusable`/`tabindex` corretto).
- Nessuna informazione veicolata solo dal colore; contrasto AA anche in grayscale.
- Rispetta `prefers-reduced-motion` nelle animazioni Angular (`@angular/animations` o CSS).
- Verifica con Lighthouse a11y >= 95 e nessun issue critico axe-core, come da standard
  di progetto.

## 8. Esempio – Buona pratica

```ts
@Component({
  standalone: true,
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as u) {
      <article>{{ u.name }}</article>
    } @else {
      <p>Caricamento…</p>
    }
  `,
})
export class UserCardComponent {
  private readonly userService = inject(UserService);
  readonly user = toSignal(this.userService.getUser());
}
```

## 9. Esempio – Da evitare

```ts
@Component({
  selector: 'user-card',
  template: `<div *ngIf="user">{{ user.name }}</div>`,
})
export class UserCardComponent {
  user: any;
  constructor(private userService: UserService) {}
  ngOnInit() {
    this.userService.getUser().subscribe((u) => (this.user = u));
  }
}
```

---

**Fonti di riferimento**: Angular Style Guide ufficiale, awesome-copilot.github.com,
ai-codingrules.com/rules/copilot/angular. Adatta e riduci queste regole in base allo
stack effettivo (NgRx vs Signal Store, Jest vs Jasmine) del progetto reale in cui questo
file viene copiato.
