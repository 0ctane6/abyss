/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { PluginNative } from "@utils/types";
import { UserStore } from "@webpack/common";

const Native = VencordNative.pluginHelpers.SkinwalkerProfile as PluginNative<typeof import("./native")>;

function snapshot() {
    const u = UserStore.getCurrentUser();
    if (!u) return;
    // La couleur d'accent existe bien sur l'objet utilisateur a l'execution,
    // mais le typage publie ne la declare pas. On la lit par un elargissement
    // etroit plutot qu'en castant tout l'objet en `any` : si un autre champ
    // disparait un jour, le compilateur le dira encore.
    // Skin Walker s'en sert comme couleur de repli du profil.
    const accent = (u as { accentColor?: number | null; }).accentColor ?? null;
    Native.writeProfile(JSON.stringify({
        id: u.id,
        username: u.username,
        globalName: u.globalName ?? null,
        discriminator: u.discriminator ?? null,
        avatar: u.avatar ?? null,
        banner: u.banner ?? null,
        accentColor: accent,
        ts: Date.now()
    }));
}

export default definePlugin({
    name: "SkinwalkerProfile",
    description: "Expose ton profil Discord à l'app Skin Walker, en local. Lecture seule, aucun envoi.",
    authors: [{ name: "0ctane", id: 0n }],
    enabledByDefault: true,

    flux: {
        CONNECTION_OPEN: snapshot,
        CURRENT_USER_UPDATE: snapshot
    },

    start() {
        snapshot();
    }
});
