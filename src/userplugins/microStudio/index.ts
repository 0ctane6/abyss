/*
 * Abyss — Micro studio
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Micro studio : envoyer de la MUSIQUE dans le micro sans que Discord la
 * massacre.
 *
 * Discord traite le micro pour la PAROLE : suppression de bruit, annulation
 * d'echo, gain automatique. Sur de la voix c'est bien. Sur de la musique,
 * ces filtres prennent les instruments soutenus pour du bruit de fond, les
 * ecrasent, et pompent le volume en permanence. Le mono acheve le tableau.
 *
 * Ce plugin fait deux choses, et il faut les distinguer parce qu'elles n'ont
 * PAS la meme fiabilite :
 *
 *   1. Couper les traitements. Les methodes du moteur audio sont stables et
 *      documentees, c'est le gain le plus audible, et c'est sans risque : au
 *      pire un appel n'existe pas et on passe.
 *
 *   2. Passer en stereo et monter le debit. La, on touche aux options de
 *      l'encodeur d'une connexion vocale. On ne CONSTRUIT jamais cette
 *      configuration : on part de celle que Discord a deja posee et on en
 *      change deux champs. Si elle n'est pas lisible, on ne tente rien -
 *      inventer un encodeur, c'est risquer un micro muet.
 *
 * Ce que ce plugin ne peut PAS faire, pour que ce soit clair :
 *   - depasser le debit du SALON. Ce plafond (8 a 96 kbps, jusqu'a 384 avec
 *     les boosts) est impose par le serveur, pas par le client. On peut
 *     occuper tout ce qui est permis, pas davantage ;
 *   - appliquer un effet au son (8D, reverbe...). Sur Discord desktop la
 *     capture du micro est NATIVE : les echantillons ne passent jamais par
 *     le JavaScript ou vit ce plugin. Cet effet se fait en amont, dans
 *     Skin Walker.
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { MediaEngineStore } from "@webpack/common";

const settings = definePluginSettings({
    sansSuppressionBruit: {
        type: OptionType.BOOLEAN,
        description: "Couper la suppression de bruit (Krisp) — elle prend les instruments tenus pour du bruit",
        default: true
    },
    sansAnnulationEcho: {
        type: OptionType.BOOLEAN,
        description: "Couper l'annulation d'écho — elle creuse des trous quand la musique et ta voix se croisent",
        default: true
    },
    sansGainAuto: {
        type: OptionType.BOOLEAN,
        description: "Couper le gain automatique — il pompe le volume en continu",
        default: true
    },
    stereo: {
        type: OptionType.BOOLEAN,
        description: "Émettre en stéréo au lieu du mono (au mieux : dépend de la version de Discord)",
        default: true
    },
    debit: {
        type: OptionType.NUMBER,
        description: "Débit visé en kbps (0 = laisser Discord décider). Le salon impose son propre plafond.",
        default: 0
    }
});

/** Le moteur audio, ou null. Tout ici doit survivre a son absence. */
function moteur(): any {
    try {
        return (MediaEngineStore as any)?.getMediaEngine?.() ?? null;
    } catch {
        return null;
    }
}

/** Appelle une methode SI elle existe. Une version de Discord peut l'avoir
 *  renommee : ce n'est pas une raison pour que tout le plugin tombe. */
function appelle(objet: any, nom: string, valeur: boolean): boolean {
    try {
        if (typeof objet?.[nom] === "function") {
            objet[nom](valeur);
            return true;
        }
    } catch { /* ignore : on garde le comportement d'origine */ }
    return false;
}

/**
 * Etat des traitements avant notre passage, pour les rendre a l'identique
 * quand le plugin s'arrete. On ne remet pas "true" aveuglement : quelqu'un
 * qui avait deja coupe Krisp a la main ne doit pas le retrouver rallume.
 */
let avant: Record<string, boolean> | null = null;

function litEtat(m: any): Record<string, boolean> | null {
    try {
        const lu: Record<string, boolean> = {};
        const s = MediaEngineStore as any;
        if (typeof s.isNoiseSuppressionEnabled === "function") lu.bruit = !!s.isNoiseSuppressionEnabled();
        if (typeof s.isEchoCancellationEnabled === "function") lu.echo = !!s.isEchoCancellationEnabled();
        if (typeof s.isAutomaticGainControlEnabled === "function") lu.gain = !!s.isAutomaticGainControlEnabled();
        if (typeof s.isNoiseCancellationEnabled === "function") lu.krisp = !!s.isNoiseCancellationEnabled();
        return Object.keys(lu).length ? lu : null;
    } catch {
        return null;
    }
}

function appliqueTraitements() {
    const m = moteur();
    if (!m) return;
    if (avant === null) avant = litEtat(m) ?? {};

    const s = settings.store;
    if (s.sansSuppressionBruit) {
        appelle(m, "setNoiseSuppression", false);
        appelle(m, "setNoiseCancellation", false);   // Krisp
    }
    if (s.sansAnnulationEcho) appelle(m, "setEchoCancellation", false);
    if (s.sansGainAuto) appelle(m, "setAutomaticGainControl", false);
}

function rendTraitements() {
    const m = moteur();
    if (!m || !avant) return;
    if ("bruit" in avant) appelle(m, "setNoiseSuppression", avant.bruit);
    if ("krisp" in avant) appelle(m, "setNoiseCancellation", avant.krisp);
    if ("echo" in avant) appelle(m, "setEchoCancellation", avant.echo);
    if ("gain" in avant) appelle(m, "setAutomaticGainControl", avant.gain);
    avant = null;
}

/**
 * Stereo et debit, sur une connexion vocale.
 *
 * Regle de prudence : on ne fabrique pas d'objet `audioEncoder`. On ne
 * touche qu'a celui que Discord a deja pose, et seulement s'il est lisible.
 * Un encodeur invente peut rendre le micro muet, et l'utilisateur n'aurait
 * aucun moyen de comprendre pourquoi.
 */
function appliqueEncodeur(conn: any) {
    try {
        if (typeof conn?.setTransportOptions !== "function") return;
        const s = settings.store;
        const options: any = {};

        if (s.stereo) {
            const actuel = conn.audioEncoder ?? conn.audioEncoderOptions;
            if (actuel && typeof actuel === "object") {
                options.audioEncoder = { ...actuel, channels: 2 };
            }
            // Pas d'encodeur lisible -> on n'essaie PAS. Voir l'en-tete.
        }
        if (s.debit > 0) options.encodingVoiceBitRate = Math.round(s.debit * 1000);

        if (Object.keys(options).length) conn.setTransportOptions(options);
    } catch { /* Discord garde ses reglages : c'est le repli voulu */ }
}

/** Les connexions vont et viennent : on suit celles qui arrivent. */
const suivies = new WeakSet<object>();

function suit(conn: any) {
    if (!conn || typeof conn !== "object" || suivies.has(conn)) return;
    suivies.add(conn);
    appliqueEncodeur(conn);
    // Le moteur peut reposer ses options en se (re)connectant : on repasse.
    try {
        conn.on?.("connected", () => {
            appliqueTraitements();
            appliqueEncodeur(conn);
        });
    } catch { /* pas d'emetteur d'evenements : le passage initial suffit */ }
}

function brancheMoteur() {
    const m = moteur();
    if (!m) return;
    try {
        m.connections?.forEach?.(suit);
        m.on?.("connection", suit);
    } catch { /* rien a brancher : les traitements restent appliques */ }
}

export default definePlugin({
    name: "MicroStudio",
    description:
        "Envoie de la musique dans le micro sans que Discord la massacre : coupe la suppression de bruit, "
        + "l'annulation d'écho et le gain automatique, et tente la stéréo. Le débit reste plafonné par le salon.",
    authors: [{ name: "0ctane", id: 0n }],
    tags: ["Voice", "Media"],
    settings,

    start() {
        appliqueTraitements();
        brancheMoteur();
    },

    stop() {
        try {
            const m = moteur();
            m?.off?.("connection", suit);
        } catch { /* ignore */ }
        rendTraitements();
    }
});
