# Abyss

**Abyss** est notre client mod Discord. C'est un **fork rebrandé d'[Equicord](https://github.com/Equicord/Equicord)**
(lui-même fork de [Vencord](https://github.com/Vendicated/Vencord), licence
**GPL-3.0** — Abyss reste open-source sous GPL-3.0, voir `LICENSE`).

On part d'Equicord pour ses **~300+ plugins intégrés** (en plus de ceux de
Vencord), tout en gardant les nôtres par-dessus.

Il s'injecte dans Discord comme Equicord, mais affiche « Abyss » dans
l'interface et range ses données dans `%APPDATA%\Abyss`.

## Ce qui est rebrandé (texte affiché uniquement)

- Réglages Discord : **Abyss** / Settings / Updater / Cloud
  (`src/plugins/_core/settings.tsx`)
- Toolbox : **Abyss Toolbox** (`src/equicordplugins/equicordToolbox/index.tsx`)
- Dossier de données → `%APPDATA%\Abyss`
  (`src/main/utils/constants.ts`, `src/main/patcher.ts`)

> On ne touche **pas** aux identifiants internes (`Vencord.Webpack`, l'alias
> `@vencord`, les en-têtes SPDX, les clés de stockage) — ça casserait le build.
> Le repo Equicord garde l'attribution Vencord en en-tête, on la garde aussi.

## Nos plugins

Dans **`src/userplugins/`** (versionné, contrairement au défaut). Exemple :
`src/userplugins/abyssHello/`. Les plugins d'Equicord, eux, sont dans
`src/equicordplugins/`.

```bash
cp -r src/userplugins/abyssHello src/userplugins/monPlugin
# édite index.tsx (name, description, start/patches…)
pnpm build
```

Le `name` du plugin = la clé dans `settings.json` (`plugins.<Name>.enabled`),
c'est aussi ce que liste l'installateur du multitool.

## Builder

```bash
pnpm install   # une fois
# IMPORTANT : --standalone --disable-updater
#   → désactive l'updater interne (sinon il réinstallerait de l'Equicord vanilla
#     par-dessus Abyss et écraserait le rebrand + nos plugins).
#   Les mises à jour passent par le multitool (rebuild ici → re-bundle).
COREPACK_ENABLE_PROJECT_SPEC=0 node --require=./scripts/suppressExperimentalWarnings.js \
  scripts/build/build.mjs --standalone --disable-updater
# → produit dist/desktop/ (patcher.js, preload.js, renderer.js, renderer.css)
```

## Lien avec le multitool (Skin Walker)

La dist est embarquée dans l'app (`auto/src-tauri/abyss/`) et installée par
l'onglet **Discord → Abyss**. Après un changement de plugin :

```bash
pnpm build
cp dist/{patcher.js,preload.js,renderer.js,renderer.css} ../auto/src-tauri/abyss/
```

(puis rebuild de l'app).

## Licence

GPL-3.0-or-later. Garder `LICENSE` et les en-têtes. Pas de selfbot /
automatisation de compte.
