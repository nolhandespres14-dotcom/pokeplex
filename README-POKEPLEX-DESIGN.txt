POKÉPLÉX — version design finale

Cette version rassemble le site public + l'administration autour du design Poképléx.
Fichiers inclus :
- index.html
- styles.css
- app.js
- admin.html
- admin.js
- affiche.png
- README.md
- README-CONNEXION.txt

Le code Supabase existant a été conservé dans app.js/admin.js.
Les fichiers supabase-config.js et schema.sql ne sont pas inclus ici car ils n'étaient pas fournis dans les fichiers disponibles ; ne pas inventer de clés Supabase.
Adresse affichée : 966 rue La Palme, Québec, Saint-Lin.


NOUVEAUTÉ — COMPTE CLIENT
- Les clients peuvent créer un compte avec une adresse courriel et un mot de passe.
- Une adresse Gmail, iCloud, Yahoo ou toute autre adresse courriel peut être utilisée.
- Les clients peuvent se connecter et se déconnecter.
- La réservation demande maintenant une connexion à un compte.
- Le nom du compte est prérempli dans la réservation.

IMPORTANT POUR QUE CELA FONCTIONNE :
Supabase Auth doit être configuré et Email/Password doit être activé.
Le fichier supabase-config.js avec SUPABASE_URL et SUPABASE_ANON_KEY doit être présent.
