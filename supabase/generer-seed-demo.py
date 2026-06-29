#!/usr/bin/env python3
# =============================================================================
# Autocar Location - Generateur de seed demo "volume"
# -----------------------------------------------------------------------------
# Produit un fichier SQL autonome (truncate + role admin + inserts batches) avec
# un GROS jeu de donnees realiste pour la demo : ~150 clients, ~500 devis repartis
# sur les 12 derniers mois, refus avec motifs, cas complexes, haut de funnel.
#
# REGLE D'OR : les prix ne sont JAMAIS inventes. Ce script porte le moteur
# `calculerDevis` (web/lib/calculerDevis.ts) a l'identique -> lignes, coefficients,
# HT/TVA/TTC coherents, comme s'ils sortaient du vrai flux.
#
# Usage :
#   python generer-seed-demo.py                 # 500 devis, sortie seed-demo-volume.sql
#   python generer-seed-demo.py --devis 800 --clients 200 --seed 7 --out mon-seed.sql
#
# Puis : Supabase -> SQL Editor -> coller le .sql -> Run.
# (Necessite que le compte admin@autocar-location.fr existe deja : voir comptes-demo.sql)
# =============================================================================

import argparse
import math
import random
from datetime import date, timedelta

# --------------------------- MATRICES (miroir TS) ----------------------------
GRILLE_FORFAIT = [
    (30, 250), (40, 320), (50, 350), (60, 390), (70, 430), (80, 500),
    (90, 540), (100, 580), (110, 620), (120, 660), (130, 700), (140, 740),
    (150, 780), (160, 820), (170, 860), (180, 900),
]
LONGUE_DISTANCE = {"seuil_km": 180, "multiplicateur_distance": 2, "prix_km": 2.5}
SAISON_PAR_MOIS = {
    1: ("basse", -0.07), 2: ("basse", -0.07), 8: ("basse", -0.07), 11: ("basse", -0.07),
    9: ("moyenne", 0.0), 10: ("moyenne", 0.0), 12: ("moyenne", 0.0),
    3: ("haute", 0.10), 4: ("haute", 0.10), 7: ("haute", 0.10),
    5: ("tres_haute", 0.15), 6: ("tres_haute", 0.15),
}
PONDATION_DATE = [
    (6, "DD_PRIORITAIRE", 0.10),
    (29, "DD_URGENT", 0.05),
    (89, "DD_NORMAL", -0.05),
    (10**9, "DD_3MOISETPLUS", -0.10),
]
PONDATION_CAPACITE = [(19, -0.05), (53, 0.0), (55, 0.15)]
SEUIL_ESCALADE = 55  # au-delà d'un autocar standard (~55 places) -> cas complexe
OPTIONS = {"guide": 80, "nuit_chauffeur": 120, "peages": 0}
MARGE = 0.15
TVA = 0.10


def round2(x):
    # JS Math.round(Number((x*100).toFixed(4)))/100 : arrondi "half up vers +Inf"
    v = float(f"{x * 100:.4f}")
    return math.floor(v + 0.5) / 100


def calculer_devis(nb_passagers, date_depart, date_demande, distance_km, aller_retour=False, options=None):
    """Port fidele de calculerDevis. Retourne dict devis ou None si escalade/erreur."""
    options = options or []
    if nb_passagers <= 0 or distance_km <= 0:
        return None
    anticip = (date_depart - date_demande).days
    if anticip < 0:
        return None
    if nb_passagers > SEUIL_ESCALADE:
        return None  # escalade -> pas de devis

    lignes = []
    coefficients = []

    if distance_km <= LONGUE_DISTANCE["seuil_km"]:
        base = next(prix for maxkm, prix in GRILLE_FORFAIT if distance_km <= maxkm)
        lignes.append({"libelle": f"Forfait transfert {distance_km} km", "montant": base})
    else:
        base = distance_km * LONGUE_DISTANCE["multiplicateur_distance"] * LONGUE_DISTANCE["prix_km"]
        lignes.append({"libelle": f"Longue distance {distance_km} km", "montant": round2(base)})

    if aller_retour:
        base *= 2
        lignes.append({"libelle": "Aller/retour (x2)", "montant": round2(base / 2)})

    mois = date_depart.month
    niveau, sa_coef = SAISON_PAR_MOIS[mois]
    coefficients.append({"libelle": f"Saison ({niveau})", "valeur": sa_coef})
    pd_code, pd_coef = next((code, coef) for maxj, code, coef in PONDATION_DATE if anticip <= maxj)
    coefficients.append({"libelle": f"Anticipation {anticip} j ({pd_code})", "valeur": pd_coef})
    pc_coef = next(coef for maxp, coef in PONDATION_CAPACITE if nb_passagers <= maxp)
    coefficients.append({"libelle": f"Capacité {nb_passagers} pax", "valeur": pc_coef})

    coef = 1 + sa_coef + pd_coef + pc_coef
    transport = base * coef
    lignes.append({"libelle": f"Coefficients (x{round2(coef)})", "montant": round2(transport - base)})

    opt = 0
    for o in options:
        code, q = (o, 1) if isinstance(o, str) else (o["code"], o.get("quantite", 1))
        if code == "guide":
            m = OPTIONS["guide"] * q
            opt += m
            lignes.append({"libelle": f"Guide ({q} j)", "montant": m})
        elif code == "nuit_chauffeur":
            m = OPTIONS["nuit_chauffeur"] * q
            opt += m
            lignes.append({"libelle": f"Nuit chauffeur ({q})", "montant": m})
        elif code == "peages":
            opt += OPTIONS["peages"]
            lignes.append({"libelle": "Péages", "montant": OPTIONS["peages"]})

    sous = transport + opt
    prix_ht = round2(sous * (1 + MARGE))
    lignes.append({"libelle": f"Marge +{round(MARGE * 100)}%", "montant": round2(prix_ht - sous)})
    tva = round2(prix_ht * TVA)
    prix_ttc = round2(prix_ht + tva)

    return {
        "prix_ht": prix_ht, "tva": tva, "prix_ttc": prix_ttc, "devise": "EUR",
        "lignes": lignes, "coefficients": coefficients,
    }


# ------------------------------ POOLS DE DONNEES -----------------------------
PRENOMS = [
    "Lucas", "Emma", "Marie", "Paul", "Sophie", "Thomas", "Léa", "Hugo", "Chloé", "Nathan",
    "Camille", "Julien", "Manon", "Antoine", "Sarah", "Maxime", "Laura", "Quentin", "Julie",
    "Alexandre", "Pauline", "Nicolas", "Clara", "Romain", "Charlotte", "Florian", "Marine",
    "Guillaume", "Audrey", "Sébastien", "Élodie", "Mathieu", "Céline", "Vincent", "Aurélie",
    "Damien", "Justine", "Benjamin", "Mélanie", "Adrien", "Caroline", "Pierre", "Anaïs",
]
NOMS = [
    "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Petit", "Durand", "Leroy", "Moreau",
    "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent",
    "Fournier", "Morel", "Girard", "André", "Lefèvre", "Mercier", "Dupont", "Lambert", "Bonnet",
    "Francois", "Martinez", "Legrand", "Garnier", "Faure", "Rousseau", "Blanc", "Guerin",
    "Muller", "Henry", "Roussel", "Nicolas", "Perrin", "Morin", "Mathieu", "Clement", "Gauthier",
]
TYPES = ["particulier", "particulier", "association", "entreprise", "collectivite"]
RUES = [
    "rue de la République", "avenue des Fleurs", "boulevard Haussmann", "cours de l'Intendance",
    "rue Nationale", "place du Capitole", "rue Victor Hugo", "avenue Jean Jaurès",
    "rue de la Paix", "boulevard Voltaire", "rue du Faubourg", "allée des Tilleuls",
    "impasse des Lilas", "chemin des Vignes", "quai de la Gare", "rue des Écoles",
]
VILLES = [
    ("Lyon", "69001"), ("Nantes", "44000"), ("Paris", "75009"), ("Bordeaux", "33000"),
    ("Lille", "59000"), ("Toulouse", "31000"), ("Marseille", "13001"), ("Nice", "06000"),
    ("Strasbourg", "67000"), ("Rennes", "35000"), ("Dijon", "21000"), ("Grenoble", "38000"),
    ("Montpellier", "34000"), ("Reims", "51100"), ("Le Havre", "76600"), ("Angers", "49000"),
]
# Trajets (depart, destination, distance_km routiere approx). Couvre court/moyen/long.
TRAJETS = [
    ("Lyon", "Annecy", 139), ("Lyon", "Grenoble", 112), ("Lyon", "Chamonix", 220),
    ("Bordeaux", "Biarritz", 185), ("Bordeaux", "Arcachon", 65), ("Bordeaux", "Toulouse", 245),
    ("Paris", "Deauville", 200), ("Paris", "Versailles", 25), ("Paris", "Chartres", 90),
    ("Nantes", "La Baule", 75), ("Nantes", "Pornic", 55), ("Nantes", "Les Sables", 110),
    ("Lille", "Bruxelles", 110), ("Lille", "Arras", 52), ("Lille", "Le Touquet", 130),
    ("Toulouse", "Lourdes", 180), ("Toulouse", "Carcassonne", 95), ("Toulouse", "Albi", 78),
    ("Marseille", "Avignon", 100), ("Marseille", "Cassis", 30), ("Marseille", "Aix", 35),
    ("Nice", "Monaco", 25), ("Nice", "Cannes", 35), ("Nice", "Menton", 30),
    ("Strasbourg", "Colmar", 75), ("Strasbourg", "Mulhouse", 115), ("Strasbourg", "Metz", 160),
    ("Rennes", "Saint-Malo", 70), ("Rennes", "Mont-Saint-Michel", 80), ("Rennes", "Brest", 245),
    ("Dijon", "Beaune", 45), ("Dijon", "Besançon", 95), ("Dijon", "Lyon", 195),
    ("Grenoble", "Chambéry", 55), ("Montpellier", "Nîmes", 50), ("Reims", "Épernay", 30),
]
RAISONS = ["Prix trop élevé", "Délai / disponibilité", "Meilleure offre ailleurs", "Projet annulé ou reporté", "Autre"]

# Messages clients "en attente" (messagerie HITL) -> font apparaître le badge admin.
MESSAGES_CLIENT = [
    "Bonjour, peut-on ajouter un arrêt en chemin ? Et un tarif si on décale d'une semaine ?",
    "Est-il possible d'avoir une facture au nom de l'association ?",
    "Le chauffeur peut-il rester sur place pendant l'événement ?",
    "On sera peut-être 5 personnes de plus, ça change quoi sur le prix ?",
    "Avez-vous des véhicules accessibles PMR pour ce trajet ?",
]

# Domaine fictif des clients de demo. Doit correspondre a un domaine "demo" cote
# front (lib/emailGuard.ts / env EMAIL_DEMO_DOMAINS) pour qu'AUCUN email reel ne parte.
DEMO_DOMAINE = "demo.autocar-location.fr"

# Client "vedette" garanti dans le jeu (reconnaissable en demo), avec des devis varies.
SHOWCASE = {
    "id": "c0000000-0000-0000-0000-00000000c0de",
    "email": "v.conter@live.fr",
    "prenom": "Vincent",
    "nom": "Conter",
    "type_client": "entreprise",
    "telephone": "0651237890",
    "adresse": "14 rue des Capucins",
    "code_postal": "67000",
    "ville": "Strasbourg",
}


# ------------------------------ UTILITAIRES SQL ------------------------------
def ruuid():
    """UUID v4 pseudo-aleatoire mais reproductible (depend du random seede)."""
    return "%08x-%04x-4%03x-%04x-%012x" % (
        random.getrandbits(32), random.getrandbits(16), random.getrandbits(12),
        0x8000 | random.getrandbits(14), random.getrandbits(48),
    )


def sql_str(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def sql_json(obj):
    import json
    s = json.dumps(obj, ensure_ascii=False)
    return "'" + s.replace("'", "''") + "'::jsonb"


def sql_ts(d):
    """date/datetime -> timestamptz litteral."""
    return "'" + d.isoformat() + "'"


def sql_date(d):
    return "'" + d.isoformat() + "'"


def sql_bool(b):
    return "true" if b else "false"


def batched_insert(out, table, cols, rows, batch=80):
    if not rows:
        return
    head = f"insert into {table} ({', '.join(cols)}) values\n"
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        out.append(head + ",\n".join(" (" + ", ".join(r) + ")" for r in chunk) + ";\n")


# --------------------------------- GENERATION --------------------------------
def main():
    ap = argparse.ArgumentParser(description="Genere un seed demo volumineux et coherent.")
    ap.add_argument("--devis", type=int, default=500, help="Nombre de devis chiffres (defaut 500)")
    ap.add_argument("--clients", type=int, default=150, help="Nombre de clients (defaut 150)")
    ap.add_argument("--complexes", type=int, default=25, help="Nombre de cas complexes a traiter, <= 2 semaines (defaut 25)")
    ap.add_argument("--funnel", type=int, default=35, help="Leads haut de funnel sans devis (defaut 35)")
    ap.add_argument("--seed", type=int, default=42, help="Graine aleatoire (reproductible)")
    ap.add_argument("--out", default="seed-demo-volume.sql", help="Fichier SQL de sortie")
    args = ap.parse_args()

    random.seed(args.seed)
    today = date.today()

    out = []
    out.append("-- =============================================================================\n")
    out.append(f"-- Autocar Location - SEED DEMO VOLUME (genere) : {args.devis} devis, {args.clients} clients\n")
    out.append(f"-- Genere par generer-seed-demo.py (seed={args.seed}). NE PAS editer a la main.\n")
    out.append("-- Supabase -> SQL Editor -> coller -> Run. Prix coherents (moteur calculerDevis).\n")
    out.append("-- =============================================================================\n\n")

    # Migration idempotente (memes colonnes que reset-demo.sql)
    out.append("alter table clients add column if not exists prenom text;\n")
    out.append("alter table clients add column if not exists nom text;\n")
    out.append("alter table clients add column if not exists adresse text;\n")
    out.append("alter table clients add column if not exists code_postal text;\n")
    out.append("alter table clients add column if not exists ville text;\n")
    out.append("alter table devis   add column if not exists token uuid not null default gen_random_uuid();\n")
    out.append("alter table devis   add column if not exists raison_refus text;\n\n")

    out.append("truncate table conversations, relances, devis, demandes, clients restart identity cascade;\n\n")
    out.append("-- Role admin (sinon /admin redirige)\n")
    out.append("insert into profiles (id, role) select id, 'admin' from auth.users "
               "where email = 'admin@autocar-location.fr' on conflict (id) do update set role = 'admin';\n\n")

    # ---- Clients ----
    clients = []
    emails_vus = set()
    client_rows = []

    # Client vedette garanti (v.conter@live.fr) en premier
    clients.append(SHOWCASE["id"])
    emails_vus.add(SHOWCASE["email"])
    client_rows.append([
        sql_str(SHOWCASE["id"]), sql_str(SHOWCASE["email"]), sql_str(SHOWCASE["type_client"]),
        sql_str(SHOWCASE["prenom"]), sql_str(SHOWCASE["nom"]), sql_str(SHOWCASE["telephone"]),
        sql_str(SHOWCASE["adresse"]), sql_str(SHOWCASE["code_postal"]), sql_str(SHOWCASE["ville"]),
        "true", sql_ts(today - timedelta(days=120)),
    ])

    for _ in range(args.clients):
        prenom = random.choice(PRENOMS)
        nom = random.choice(NOMS)
        ville, cp = random.choice(VILLES)
        # email unique
        base_email = f"{prenom}.{nom}".lower().replace("é", "e").replace("è", "e").replace("ç", "c").replace(" ", "")
        # Domaine sentinelle de DEMO : le code (lib/emailGuard.ts) n'envoie AUCUN
        # email reel a ce domaine, mais traite toute la logique (statuts, relances).
        email = f"{base_email}@{DEMO_DOMAINE}"
        n = 1
        while email in emails_vus:
            n += 1
            email = f"{base_email}{n}@{DEMO_DOMAINE}"
        emails_vus.add(email)
        cid = ruuid()
        tel = "06" + "".join(str(random.randint(0, 9)) for _ in range(8))
        adresse = f"{random.randint(1, 120)} {random.choice(RUES)}"
        type_client = random.choice(TYPES)
        clients.append(cid)
        client_rows.append([
            sql_str(cid), sql_str(email), sql_str(type_client), sql_str(prenom), sql_str(nom),
            sql_str(tel), sql_str(adresse), sql_str(cp), sql_str(ville), "true",
            sql_ts(today - timedelta(days=random.randint(0, 365))),
        ])
    out.append(f"-- {len(client_rows)} clients\n")
    batched_insert(out, "clients",
                   ["id", "email", "type_client", "prenom", "nom", "telephone", "adresse", "code_postal", "ville", "consentement", "created_at"],
                   client_rows)
    out.append("\n")

    # ---- Devis chiffres ----
    # Distribution des statuts (somme ~ 1.0)
    STATUTS = [
        ("accepte", 0.28), ("refuse", 0.18), ("expire", 0.08),
        ("envoye", 0.18), ("relance_1", 0.12), ("relance_2", 0.10), ("brouillon_perdu", 0.06),
    ]
    statut_choices = [s for s, _ in STATUTS]
    statut_weights = [w for _, w in STATUTS]

    # Mapping devis.statut -> demande.statut + nb_relances
    def map_demande(devis_statut):
        return {
            "accepte": ("accepte", random.choice([0, 0, 1])),
            "refuse": ("refuse", random.choice([0, 1, 1, 2])),
            "expire": ("cloture", 2),
            "envoye": ("devis_envoye", 0),
            "relance_1": ("relance_1", 1),
            "relance_2": ("relance_2", 2),
            "brouillon_perdu": ("cloture", random.choice([1, 2])),
        }[devis_statut]

    demande_rows, devis_rows, conv_rows = [], [], []

    def build_devis(cid, created, forced=None):
        """Cree (demande + devis [+ conversation]) coherents. `forced` impose statut/trajet/pax/ar."""
        forced = forced or {}
        depart, destination, dist = forced.get("trajet") or random.choice(TRAJETS)
        anticip = random.choice([3, 7, 12, 20, 35, 50, 75, 100, 140, 175])
        date_depart = created + timedelta(days=anticip)
        nb_pax = forced.get("pax") or random.choice([8, 12, 15, 20, 25, 30, 35, 40, 45, 48, 50, 53, 55])
        aller_retour = forced["ar"] if "ar" in forced else random.random() < 0.6
        options = []
        if random.random() < 0.18:
            options.append({"code": "guide", "quantite": random.choice([1, 2])})
        if random.random() < 0.10:
            options.append({"code": "nuit_chauffeur", "quantite": 1})

        d = calculer_devis(nb_pax, date_depart, created, dist, aller_retour, options)
        if d is None:
            return  # securite (ne devrait pas, nb_pax <= 80)

        statut = forced.get("statut") or random.choices(statut_choices, weights=statut_weights, k=1)[0]
        dem_statut, nb_relances = map_demande(statut)
        devis_statut = "envoye" if statut in ("envoye", "relance_1", "relance_2", "brouillon_perdu") else statut
        if statut == "brouillon_perdu":
            devis_statut = "expire"

        urgence = "urgent" if anticip <= 29 else "normal"
        did, eid, token = ruuid(), ruuid(), ruuid()
        # Conversation + message client en attente (badge admin "non lu").
        hitl = bool(forced.get("hitl"))
        age_j = (today - created).days
        create_conv = random.random() < 0.30 or hitl
        pending = hitl or (create_conv and age_j <= 30 and random.random() < 0.20)

        demande_rows.append([
            sql_str(did), sql_str(cid), sql_str(depart), sql_str(destination), sql_date(date_depart),
            sql_bool(aller_retour), str(nb_pax), str(dist), sql_str(urgence), sql_str(dem_statut),
            sql_ts(created), sql_bool(pending),
        ])

        # prochaine_relance : pertinente pour les "en attente"
        relance_clause = "null"
        if statut == "envoye":
            relance_clause = sql_ts(created + timedelta(days=random.choice([2, 3])))
        elif statut == "relance_1":
            relance_clause = sql_ts(created + timedelta(days=random.choice([5, 6, 7])))
        elif statut == "relance_2":
            relance_clause = sql_ts(today + timedelta(days=random.choice([-1, 1, 7])))

        raison = sql_str(",".join(random.sample(RAISONS, random.choice([1, 1, 2])))) if statut == "refuse" else "null"

        devis_rows.append([
            sql_str(eid), sql_str(did), sql_str(cid),
            f"{d['prix_ht']:.2f}", f"{d['tva']:.2f}", f"{d['prix_ttc']:.2f}", "'EUR'",
            sql_json(d["lignes"]), sql_json(d["coefficients"]), sql_str(devis_statut),
            sql_ts(created), relance_clause, str(nb_relances), sql_str(token), raison,
            sql_ts(created),
        ])

        if create_conv:
            msgs = [
                {"role": "agent", "content": "Bonjour ! Quel est votre projet de déplacement ?"},
                {"role": "user", "content": f"{depart} vers {destination}, {nb_pax} personnes"},
                {"role": "agent", "content": "Votre devis est disponible, je vous l'envoie par email."},
            ]
            if pending:
                # Message client en attente de réponse -> badge "non lu" côté admin.
                msgs.append({"role": "user", "content": random.choice(MESSAGES_CLIENT)})
            conv_rows.append([
                sql_str(ruuid()), sql_str(cid), sql_str(did), sql_json(msgs), sql_ts(created),
            ])

    # Devis vedette (v.conter@live.fr) : varies et RECENTS -> visibles dans la table admin.
    SHOWCASE_DEVIS = [
        {"statut": "accepte", "trajet": ("Strasbourg", "Colmar", 75), "pax": 45, "ar": True},
        {"statut": "envoye", "trajet": ("Strasbourg", "Metz", 160), "pax": 30, "ar": False, "hitl": True},
        {"statut": "refuse", "trajet": ("Strasbourg", "Mulhouse", 115), "pax": 55, "ar": True},
        {"statut": "relance_1", "trajet": ("Lyon", "Annecy", 139), "pax": 40, "ar": True},
    ]
    for spec in SHOWCASE_DEVIS:
        build_devis(SHOWCASE["id"], today - timedelta(days=random.randint(1, 10)), forced=spec)

    # Devis tout-venant. Recency : ~25% sur les 3 dernieres semaines (pour peupler la
    # table "demandes recentes" avec des PRIX), le reste etale sur 12 mois (courbes).
    for _ in range(args.devis):
        cid = random.choice(clients)
        if random.random() < 0.25:
            age_days = random.randint(0, 20)
        else:
            age_days = int(random.triangular(10, 365, 120))
        build_devis(cid, today - timedelta(days=age_days))

    out.append(f"-- {len(devis_rows)} devis chiffres (+ demandes associees)\n")
    batched_insert(out, "demandes",
                   ["id", "client_id", "depart", "destination", "date_depart", "aller_retour",
                    "nb_passagers", "distance_km", "urgence", "statut", "created_at", "msg_non_lu_admin"],
                   demande_rows)
    out.append("\n")
    batched_insert(out, "devis",
                   ["id", "demande_id", "client_id", "prix_ht", "tva", "prix_ttc", "devise",
                    "lignes", "coefficients", "statut", "date_envoi", "prochaine_relance",
                    "nb_relances", "token", "raison_refus", "created_at"],
                   devis_rows)
    out.append("\n")

    # ---- Cas complexes (a traiter) : > 85 pax, sans devis ----
    complexe_rows = []
    for _ in range(args.complexes):
        cid = random.choice(clients)
        depart, destination, dist = random.choice(TRAJETS)
        nb_pax = random.choice([58, 60, 65, 75, 90, 110, 140, 180, 220])
        age_days = random.randint(0, 13)  # 'A traiter' : jamais plus vieux que 2 semaines
        created = today - timedelta(days=age_days)
        date_depart = created + timedelta(days=random.randint(10, 120))
        urgence = "urgent" if random.random() < 0.4 else "normal"
        complexe_rows.append([
            sql_str(ruuid()), sql_str(cid), sql_str(depart), sql_str(destination), sql_date(date_depart),
            sql_bool(random.random() < 0.6), str(nb_pax), str(dist), sql_str(urgence),
            "'cas_complexe'",
            sql_str(f"Volume de {nb_pax} passagers > {SEUIL_ESCALADE} : transfert a un commercial."),
            sql_ts(created),
        ])
    out.append(f"-- {len(complexe_rows)} cas complexes (file 'A traiter')\n")
    batched_insert(out, "demandes",
                   ["id", "client_id", "depart", "destination", "date_depart", "aller_retour",
                    "nb_passagers", "distance_km", "urgence", "statut", "commentaire", "created_at"],
                   complexe_rows)
    out.append("\n")

    # ---- Haut de funnel : nouveau_lead / qualifiee / incomplete ----
    funnel_rows = []
    for _ in range(args.funnel):
        cid = random.choice(clients)
        depart, destination, dist = random.choice(TRAJETS)
        st = random.choices(["nouveau_lead", "qualifiee", "incomplete"], weights=[0.5, 0.3, 0.2])[0]
        age_days = random.randint(0, 45)
        created = today - timedelta(days=age_days)
        if st == "incomplete":
            funnel_rows.append([
                sql_str(ruuid()), sql_str(cid), sql_str(depart), sql_str(destination), "null",
                "false", "null", "null", "'normal'", sql_str(st), sql_ts(created),
            ])
        else:
            nb_pax = random.choice([15, 25, 30, 40, 55])
            date_depart = created + timedelta(days=random.randint(15, 150))
            funnel_rows.append([
                sql_str(ruuid()), sql_str(cid), sql_str(depart), sql_str(destination), sql_date(date_depart),
                sql_bool(random.random() < 0.5), str(nb_pax), str(dist), "'normal'", sql_str(st), sql_ts(created),
            ])
    out.append(f"-- {len(funnel_rows)} leads haut de funnel (sans devis)\n")
    batched_insert(out, "demandes",
                   ["id", "client_id", "depart", "destination", "date_depart", "aller_retour",
                    "nb_passagers", "distance_km", "urgence", "statut", "created_at"],
                   funnel_rows)
    out.append("\n")

    # ---- Conversations ----
    if conv_rows:
        out.append(f"-- {len(conv_rows)} conversations\n")
        batched_insert(out, "conversations",
                       ["id", "client_id", "demande_id", "messages", "updated_at"], conv_rows)
        out.append("\n")

    # Lie les clients generes a un eventuel compte Auth de meme email -> ils verront
    # leurs devis dans /espace-client (ex: creer un compte v.conter@live.fr pour la demo).
    out.append("-- Liaison auto client <-> compte Auth (meme email)\n")
    out.append("update clients set auth_user_id = u.id from auth.users u "
               "where lower(u.email) = lower(clients.email) and clients.auth_user_id is null;\n\n")
    out.append("-- Fin du seed.\n")

    with open(args.out, "w", encoding="utf-8") as f:
        f.write("".join(out))

    total_dem = len(demande_rows) + len(complexe_rows) + len(funnel_rows)
    print(f"OK -> {args.out}")
    print(f"   clients      : {len(client_rows)}")
    print(f"   devis         : {len(devis_rows)}")
    print(f"   demandes      : {total_dem} (dont {len(complexe_rows)} cas complexes, {len(funnel_rows)} funnel)")
    print(f"   conversations : {len(conv_rows)}")


if __name__ == "__main__":
    main()
