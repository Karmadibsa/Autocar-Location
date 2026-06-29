-- =============================================================================
-- Annuaire des autocaristes partenaires — DONNÉES MOCK (démo).
-- Avec qui on travaille : flotte, capacité, contact, zone, note interne.
-- Idempotent : vide puis réinsère. (La table est créée par reset-complet.sql /
-- ajout-autocaristes.sql.)
-- =============================================================================
truncate table autocaristes restart identity cascade;

insert into autocaristes (nom, ville, departement, nb_vehicules, capacite_max, contact_email, contact_tel, note, specialites, actif) values
 ('Cars Rhône Évasion',      'Lyon',        'Rhône (69)',          18, 63, 'contact@rhone-evasion.fr',     '0472100100', 4.6, 'Tourisme, scolaire, longue distance', true),
 ('Alpes Autocars',          'Grenoble',    'Isère (38)',          12, 59, 'resa@alpes-autocars.fr',       '0476200200', 4.4, 'Montagne, navettes ski', true),
 ('Atlantique Voyages',      'Nantes',      'Loire-Atlantique (44)',22, 71, 'info@atlantique-voyages.fr',  '0240300300', 4.7, 'Grands groupes, événementiel', true),
 ('Gironde Cars',            'Bordeaux',    'Gironde (33)',        15, 63, 'contact@gironde-cars.fr',      '0556400400', 4.3, 'Vignobles, oenotourisme', true),
 ('Nord Évasion',            'Lille',       'Nord (59)',           20, 71, 'resa@nord-evasion.fr',         '0320500500', 4.5, 'Transfrontalier (Belgique)', true),
 ('Occitanie Bus',           'Toulouse',    'Haute-Garonne (31)',  16, 67, 'contact@occitanie-bus.fr',     '0561600600', 4.2, 'Pèlerinages, scolaire', true),
 ('Méditerranée Autocars',   'Marseille',   'Bouches-du-Rhône (13)',24, 71, 'info@medi-autocars.fr',       '0491700700', 4.1, 'Croisières, aéroport', true),
 ('Côte d''Azur Lignes',     'Nice',        'Alpes-Maritimes (06)',10, 53, 'resa@cotedazur-lignes.fr',     '0493800800', 4.8, 'Haut de gamme, séminaires', true),
 ('Alsace Cars',             'Strasbourg',  'Bas-Rhin (67)',       14, 63, 'contact@alsace-cars.fr',       '0388900900', 4.5, 'Marchés de Noël, Europe', true),
 ('Bretagne Mobilités',      'Rennes',      'Ille-et-Vilaine (35)',13, 59, 'info@bretagne-mobilites.fr',   '0299010101', 4.4, 'Littoral, scolaire', true),
 ('Bourgogne Tourisme Cars', 'Dijon',       'Côte-d''Or (21)',      9, 53, 'resa@bourgogne-cars.fr',       '0380020202', 4.0, 'Oenotourisme, petits groupes', true),
 ('Capitale Autocars',       'Paris',       'Paris (75)',          30, 71, 'contact@capitale-autocars.fr', '0140030303', 4.6, 'Grands événements, international', true),
 ('Loire Évasion',           'Angers',      'Maine-et-Loire (49)',  8, 53, 'info@loire-evasion.fr',        '0241040404', 3.9, 'Châteaux, scolaire', false),
 ('Champagne Cars',          'Reims',       'Marne (51)',          11, 59, 'resa@champagne-cars.fr',       '0326050505', 4.3, 'Oenotourisme, séminaires', true);
