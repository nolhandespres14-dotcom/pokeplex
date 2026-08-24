# Vente de cartes Pokémon — site public

Ce dossier est un site prêt à être publié sur Internet, utilisable dans Safari et Google Chrome.

## Ce que le site fait
- Page publique avec les cartes disponibles.
- Toi seul peux te connecter à `/admin.html` pour ajouter les cartes, choisir la photo et le prix.
- Les visiteurs peuvent cliquer sur **Je vais l’acheter**.
- La carte est réservée et passe en statut « réservée ».
- Le visiteur voit l’adresse de ramassage : **966 rue La Palme, Québec, Saint-Lin**.
- Le paiement se fait sur place, en argent comptant.

## Pour que ce soit réellement public et sécurisé
Le site utilise Supabase pour la connexion administrateur, la base de données et les photos. Tu dois créer un projet Supabase gratuit, exécuter `schema.sql`, créer ton compte administrateur dans Authentication, puis copier `supabase-config.example.js` vers `supabase-config.js` et mettre ton URL/ta clé publique.

Ensuite, publie le dossier sur un hébergeur statique comme Netlify, Vercel ou GitHub Pages.

### Important
Le fichier `supabase-config.js` contient une clé publique (anon key), ce qui est normal pour Supabase. La sécurité vient des règles RLS dans `schema.sql`. Ne mets jamais une clé `service_role` dans le site.
