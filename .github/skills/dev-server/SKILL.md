---
name: dev-server
description: "Skill per avviare il dev server locale di Tabellandia (vite --port=4000). Usare quando l'utente chiede di avviare/testare l'app in locale, verificare a runtime una modifica, o fare una verifica visiva/manuale nel browser."
license: MIT
---

# Skill: Avviare il dev server (Tabellandia)

Skill di riferimento per avviare il server di sviluppo locale di Tabellandia.
Da invocare quando l'utente chiede di avviare/testare l'app in locale, vedere
le modifiche a runtime, o fare una verifica visiva/manuale nel browser.

## Quando usare questa skill

- L'utente chiede di "avviare il dev server", "far partire l'app", "testare in locale".
- Serve verificare a runtime una modifica appena fatta (UI, comportamento, audio).

## Comando

```powershell
cd C:\works\Tabellandia
npm run dev
```

- Porta: **4000** (configurata nello script `dev` di `package.json`:
  `vite --port=4000 --host=0.0.0.0`).
- URL locale: http://localhost:4000

## Note

- È un processo long-running: avviarlo in modalità `async` (o `detach: true`
  se deve restare attivo oltre la sessione corrente).
- Se la porta 4000 risulta già occupata, verificare processi Node esistenti
  prima di avviarne uno nuovo, per evitare istanze duplicate.
