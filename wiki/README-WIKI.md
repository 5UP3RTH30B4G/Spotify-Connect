# Configuration automatique du Wiki GitHub

Ce dossier contient tous les fichiers nécessaires pour alimenter le wiki GitHub de Spotify Connect.

## 📋 Structure du wiki

```
wiki/
├── Home.md                     # Page d'accueil du wiki
├── Installation.md             # Guide d'installation complète
├── Architecture.md             # Documentation technique
├── Scripts-de-deploiement.md   # Guide des scripts automatisés
├── FAQ.md                      # Questions fréquemment posées
└── README-WIKI.md             # Ce fichier
```

## 🚀 Comment configurer le wiki GitHub

### Méthode automatique (recommandée)

1. **Activez le wiki sur GitHub :**
   - Allez sur votre repository GitHub
   - Cliquez sur l'onglet "Settings"
   - Descendez à la section "Features"
   - Cochez "Wikis"

2. **Clonez le wiki :**
   ```bash
   git clone https://github.com/5UP3RTH30B4G/spotify-connect.wiki.git
   cd spotify-connect.wiki
   ```

3. **Copiez les fichiers du wiki :**
   ```bash
   # Depuis votre projet principal
   cp wiki/*.md ../spotify-connect.wiki/
   cd ../spotify-connect.wiki
   ```

4. **Publiez le wiki :**
   ```bash
   git add .
   git commit -m "📚 Ajout de la documentation wiki complète"
   git push origin master
   ```

### Méthode manuelle

1. **Activez le wiki** dans les paramètres GitHub
2. **Créez chaque page** manuellement via l'interface GitHub
3. **Copiez-collez** le contenu de chaque fichier `.md`

## 📁 Correspondance des fichiers

| Fichier local | Page wiki GitHub |
|---------------|------------------|
| `Home.md` | Page d'accueil (automatique) |
| `Installation.md` | "Installation" |
| `Architecture.md` | "Architecture" |
| `Scripts-de-deploiement.md` | "Scripts de déploiement" |
| `FAQ.md` | "FAQ" |

## 🔧 Script de synchronisation automatique

Créez ce script pour synchroniser automatiquement :

```bash
#!/bin/bash
# sync-wiki.sh

echo "🔄 Synchronisation du wiki..."

# Cloner ou mettre à jour le wiki
if [ -d "spotify-connect.wiki" ]; then
    cd spotify-connect.wiki
    git pull origin master
    cd ..
else
    git clone https://github.com/5UP3RTH30B4G/spotify-connect.wiki.git
fi

# Copier les fichiers
cp wiki/*.md spotify-connect.wiki/

# Publier les changements
cd spotify-connect.wiki
git add .
git commit -m "📚 Mise à jour automatique de la documentation"
git push origin master

echo "✅ Wiki synchronisé avec succès !"
```

Rendez-le exécutable :
```bash
chmod +x sync-wiki.sh
./sync-wiki.sh
```

## 🎯 Navigation du wiki

Le wiki GitHub générera automatiquement :
- **Sidebar** avec liens vers toutes les pages
- **Historique** des modifications
- **Recherche** dans le contenu
- **Liens** inter-pages automatiques

## 📝 Bonnes pratiques pour le wiki

### Structure des liens
- Utilisez des liens relatifs : `[Installation](Installation)`
- Pas d'extension `.md` dans les liens wiki
- Les espaces deviennent des tirets : `Scripts-de-deploiement`

### Images et assets
```markdown
# Stockage dans le repository principal
![Architecture](../raw/main/docs/images/architecture.png)

# Ou dans le wiki (upload via interface GitHub)
![Screenshot](uploads/screenshot.png)
```

### Mise à jour
- **Modifiez** les fichiers dans `/wiki/` de votre projet principal
- **Synchronisez** avec le script ou manuellement
- **Evitez** de modifier directement le wiki GitHub (sera écrasé)

## 🔗 Liens utiles

- **Wiki GitHub Docs** : [docs.github.com/wikis](https://docs.github.com/en/communities/documenting-your-project-with-wikis)
- **Markdown Guide** : [markdownguide.org](https://www.markdownguide.org/)
- **Repository principal** : [spotify-connect](https://github.com/5UP3RTH30B4G/spotify-connect)

---

**Note :** Ce fichier (`README-WIKI.md`) n'est pas destiné à être copié dans le wiki GitHub. Il sert uniquement à documenter la configuration du wiki.