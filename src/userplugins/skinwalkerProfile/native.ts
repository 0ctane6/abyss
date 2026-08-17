/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

// Pont local Abyss -> Skin Walker : on dépose le profil dans %APPDATA%\Abyss,
// le même dossier que l'app utilise déjà pour la dist et les réglages d'Abyss.
export async function writeProfile(_: any, json: string) {
    const dir = join(app.getPath("appData"), "Abyss");
    await mkdir(dir, { recursive: true }).catch(() => { });
    await writeFile(join(dir, "skinwalker-profile.json"), json, "utf8").catch(() => { });
}
