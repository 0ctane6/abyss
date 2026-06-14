/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { showNotification } from "@api/Notifications";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    greet: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when Discord starts.",
        default: true
    }
});

export default definePlugin({
    name: "AbyssHello",
    description: "Abyss sample plugin. Copy this folder to create your own.",
    authors: [{ name: "0ctane", id: 0n }],
    settings,

    start() {
        if (!settings.store.greet) return;
        showNotification({
            title: "Abyss",
            body: "Client mod actif. Ajoute tes plugins dans src/userplugins/."
        });
    }
});
