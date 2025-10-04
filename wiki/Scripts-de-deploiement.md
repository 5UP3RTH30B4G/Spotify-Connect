# 🚀 Scripts de déploiement

Cette page détaille l'utilisation des scripts de déploiement automatisés pour Spotify Connect.

## 🎯 Vue d'ensemble

Les scripts de déploiement permettent de :
- ✅ **Automatiser** complètement le processus de déploiement
- 🔐 **Sécuriser** vos identifiants (non exposés dans le code)
- ⚡ **Accélérer** les mises à jour en production
- 🔧 **Personnaliser** le type de déploiement selon vos besoins

## 📋 Scripts disponibles

### 1. `set-deploy-config.cmd` - Configuration sécurisée
**Usage :** Configuration initiale des identifiants de serveur
```cmd
set-deploy-config.cmd
```

**Ce que fait ce script :**
- Crée un fichier `deploy-config.env` depuis l'exemple
- Vous guide pour saisir vos identifiants serveur
- Définit les variables d'environnement système
- Teste la connectivité SSH

### 2. `setup-ssh.cmd` - Configuration SSH
**Usage :** Configuration de l'authentification SSH sans mot de passe
```cmd
setup-ssh.cmd
```

**Ce que fait ce script :**
- Génère une paire de clés SSH si nécessaire
- Teste la connexion SSH
- Fournit les instructions pour configurer la clé sur le serveur

### 3. `deploy.cmd` - Déploiement principal
**Usage :** Déploiement complet ou partiel avec options
```cmd
deploy.cmd [OPTIONS]
```

**Options disponibles :**
| Option | Description |
|--------|-------------|
| `--client-only` | Déploie uniquement le client React |
| `--server-only` | Déploie uniquement le serveur Node.js |
| `--no-build` | Ignore la phase de build du client |
| `--no-restart` | N'effectue pas le redémarrage PM2 |
| `--host HOST` | Spécifie un serveur différent |
| `--user USER` | Spécifie un utilisateur différent |
| `--path PATH` | Spécifie un chemin différent |
| `--help` | Affiche l'aide complète |

**Exemples d'utilisation :**
```cmd
# Déploiement complet (recommandé)
deploy.cmd

# Client seulement (après modification front-end)
deploy.cmd --client-only

# Serveur seulement (après modification back-end)  
deploy.cmd --server-only

# Déploiement rapide sans rebuild
deploy.cmd --no-build --no-restart

# Vers un serveur de test
deploy.cmd --host test.monserveur.com
```

### 4. `quick-deploy.cmd` - Déploiement express
**Usage :** Déploiement ultra-rapide du client uniquement
```cmd
quick-deploy.cmd
```

**Idéal pour :**
- Modifications mineures de l'interface
- Corrections de style CSS
- Ajustements de composants React
- Tests rapides en production

## 🔧 Configuration initiale

### Première utilisation (une seule fois)

1. **Configurez vos identifiants :**
   ```cmd
   set-deploy-config.cmd
   ```
   - Créera `deploy-config.env` avec vos paramètres
   - Ce fichier est ignoré par Git (sécurisé)

2. **Configurez SSH :**
   ```cmd
   setup-ssh.cmd
   ```
   - Génère les clés SSH si nécessaire
   - Teste la connexion

3. **Premier déploiement :**
   ```cmd
   deploy.cmd
   ```

### Structure du fichier de configuration

Le fichier `deploy-config.env` contient :
```env
# Votre serveur de production
DEPLOY_HOST=votre-serveur.com
DEPLOY_USER=votre-utilisateur  
DEPLOY_PATH=/chemin/vers/votre/app

# Exemples :
# DEPLOY_HOST=spotify-connect.mondomaine.com
# DEPLOY_USER=ubuntu
# DEPLOY_PATH=/var/www/spotify-connect
```

## 🔄 Workflow de développement

### Modifications front-end uniquement
```cmd
quick-deploy.cmd
```
⏱️ **Temps estimé :** 30-60 secondes

### Modifications back-end uniquement
```cmd
deploy.cmd --server-only
```
⏱️ **Temps estimé :** 1-2 minutes

### Modifications complètes
```cmd
deploy.cmd
```
⏱️ **Temps estimé :** 2-3 minutes

### Déploiement d'urgence (hotfix)
```cmd
deploy.cmd --no-build --client-only
```
⏱️ **Temps estimé :** 15-30 secondes

## 🔍 Processus de déploiement détaillé

### Étapes du déploiement complet (`deploy.cmd`)

1. **Vérification** de la connexion SSH
2. **Build** du client React (si `--no-build` non spécifié)
3. **Installation** des dépendances npm (si nécessaire)
4. **Transfert** des fichiers via SCP :
   - `client/build/` → Serveur
   - `server/` → Serveur  
   - `ecosystem.config.js` → Serveur
5. **Installation** des dépendances serveur
6. **Redémarrage** PM2 (si `--no-restart` non spécifié)
7. **Vérification** du statut final

### Sécurité des transferts

- ✅ **Connexion chiffrée** via SSH/SCP
- ✅ **Authentification par clé** (pas de mot de passe)
- ✅ **Vérifications** d'intégrité à chaque étape
- ✅ **Rollback automatique** en cas d'échec critique

## ⚠️ Troubleshooting

### Erreur de connexion SSH
```cmd
# 1. Reconfigurer SSH
setup-ssh.cmd

# 2. Tester manuellement
ssh votre-user@votre-serveur.com
```

### Erreur de build
```cmd
# 1. Nettoyer et rebuilder localement
cd client
npm ci
npm run build

# 2. Déployer sans rebuild
deploy.cmd --no-build
```

### Erreur PM2
```cmd
# Sur le serveur, redémarrer PM2
ssh votre-user@votre-serveur.com
pm2 kill
pm2 start ecosystem.config.js
```

### Variables d'environnement perdues
```cmd
# Reconfigurer
set-deploy-config.cmd
```

## 📊 Logs et monitoring

### Vérifier les logs de déploiement
Les scripts affichent des logs détaillés :
- ✅ Étapes réussies en vert
- ⚠️ Avertissements en jaune  
- ❌ Erreurs en rouge

### Vérifier les logs du serveur
```cmd
# Via SSH
ssh votre-user@votre-serveur.com "pm2 logs"
```

### Vérifier le statut de l'application
```cmd
# Via SSH
ssh votre-user@votre-serveur.com "pm2 status"
```

## 🎯 Bonnes pratiques

### Développement
1. **Testez localement** avant de déployer
2. **Utilisez `quick-deploy.cmd`** pour les petites modifications
3. **Gardez des sauvegardes** de votre configuration

### Production
1. **Déployez pendant les heures creuses**
2. **Surveillez les logs** après déploiement
3. **Testez l'application** après chaque déploiement

### Sécurité
1. **Ne commitez jamais** `deploy-config.env`
2. **Changez vos clés SSH** régulièrement
3. **Limitez les accès** au serveur de production

---

## 📞 Support

- **Documentation complète :** [DEPLOY.md](../DEPLOY.md)
- **Issues GitHub :** [Créer une issue](https://github.com/5UP3RTH30B4G/spotify-connect/issues)
- **Wiki principal :** [Retour au wiki](Home)