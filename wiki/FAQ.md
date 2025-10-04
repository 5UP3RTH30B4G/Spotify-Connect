# ❓ FAQ - Questions Fréquemment Posées

## 🎵 Questions générales

### Qu'est-ce que Spotify Connect ?
Spotify Connect est une application web collaborative qui permet à plusieurs utilisateurs de contrôler Spotify ensemble en temps réel. Contrairement au Spotify Connect officiel, cette application permet le chat, la file d'attente partagée et la synchronisation entre utilisateurs.

### Faut-il un compte Spotify Premium ?
**Oui, Spotify Premium est obligatoire** pour contrôler la lecture. L'API Spotify ne permet le contrôle de la lecture qu'aux comptes Premium. Les comptes gratuits peuvent voir l'interface mais ne peuvent pas lancer de musique.

### Combien d'utilisateurs peuvent se connecter simultanément ?
Il n'y a pas de limite technique imposée par l'application. La limite dépend de :
- La puissance de votre serveur
- La bande passante disponible
- Les limites de rate de l'API Spotify (environ 100 requêtes/minute)

En pratique, 10-50 utilisateurs simultanés fonctionnent parfaitement.

## 🔧 Installation et configuration

### L'installation échoue avec "npm ERR!"
```bash
# Solution 1 : Nettoyer le cache npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Solution 2 : Utiliser une version de Node.js compatible
nvm install 18
nvm use 18
npm install
```

### "Cannot connect to Spotify API"
Vérifiez votre configuration `.env` :
- `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` correctes
- `SPOTIFY_REDIRECT_URI` correspond exactement à celle configurée sur Spotify Developer Dashboard
- Votre application Spotify est en mode "Development" ou "Extended Quota Mode"

### Les variables d'environnement ne sont pas reconnues
```bash
# Vérifiez le fichier .env
cat server/.env

# Vérifiez que le fichier est dans le bon dossier
ls -la server/.env

# Redémarrez l'application
pm2 restart ecosystem.config.js
```

## 🚀 Déploiement

### Les scripts de déploiement ne fonctionnent pas
1. **Vérifiez la configuration SSH :**
```cmd
setup-ssh.cmd
```

2. **Vérifiez vos identifiants :**
```cmd
set-deploy-config.cmd
```

3. **Testez manuellement :**
```cmd
ssh votre-user@votre-serveur.com
```

### "Permission denied" lors du déploiement
```bash
# Sur le serveur, ajustez les permissions
sudo chown -R votre-user:votre-user /var/www/spotify-connect
chmod -R 755 /var/www/spotify-connect
```

### PM2 ne démarre pas
```bash
# Diagnostiquer le problème
pm2 logs

# Nettoyer PM2
pm2 kill
pm2 start ecosystem.config.js

# Vérifier la configuration
pm2 show spotify-connect-server
```

## 🎮 Utilisation

### "No active device found"
Cette erreur signifie qu'aucun appareil Spotify n'est actif :

**Solutions :**
1. **Ouvrez Spotify** sur un appareil (téléphone, ordinateur, enceinte connectée)
2. **Lancez une chanson** sur cet appareil
3. **Rafraîchissez** l'application web
4. **Réessayez** les contrôles

### La musique ne se synchronise pas entre utilisateurs
**Causes possibles :**
- Un utilisateur utilise Spotify sur son téléphone en parallèle
- Connexion Socket.IO interrompue
- Rate limiting de l'API Spotify

**Solutions :**
1. **Fermez Spotify** sur tous les autres appareils
2. **Rafraîchissez** la page web
3. **Un seul utilisateur** doit contrôler à la fois

### Le chat ne fonctionne pas
**Vérifications :**
1. **Socket.IO connecté** : Vérifiez l'indicateur de connexion
2. **Firewall** : Port 5000 ouvert pour WebSocket
3. **Logs serveur** : `pm2 logs` pour voir les erreurs

### L'interface est cassée sur mobile
**Solutions :**
1. **Videz le cache** du navigateur
2. **Rechargez** la page (F5 ou Ctrl+R)
3. **Utilisez un navigateur récent** (Chrome, Firefox, Safari)

## 🔐 Sécurité et authentification

### "Invalid redirect URI"
L'URI de redirection dans votre application Spotify Developer doit **exactement** correspondre :

**Développement :**
```
http://localhost:5000/auth/callback
```

**Production :**
```
https://votre-domaine.com/auth/callback
```

**Attention :** Pas de `/` à la fin, `http` vs `https`, port exact.

### Les tokens Spotify expirent constamment
Les tokens Spotify expirent après 1 heure. L'application gère automatiquement le renouvellement via le `refresh_token`.

**Si le problème persiste :**
1. Vérifiez que `SPOTIFY_CLIENT_SECRET` est correct
2. Redémarrez le serveur
3. Reconnectez-vous à Spotify

### Comment sécuriser mon serveur ?
**Bonnes pratiques :**
1. **Firewall** : N'ouvrez que les ports nécessaires (22, 80, 443)
2. **SSL** : Utilisez HTTPS en production
3. **Mises à jour** : Maintenez le système à jour
4. **Clés SSH** : Désactivez l'authentification par mot de passe
5. **Variables sensibles** : Ne commitez jamais les fichiers `.env`

## 📱 Compatibilité

### Quels navigateurs sont supportés ?
**Supportés :**
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

**Partiellement supportés :**
- Chrome mobile
- Safari mobile
- Firefox mobile

**Non supportés :**
- Internet Explorer
- Navigateurs très anciens

### L'application fonctionne-t-elle hors ligne ?
**Non**, l'application nécessite une connexion Internet pour :
- Communiquer avec l'API Spotify
- Synchroniser entre utilisateurs via Socket.IO
- Télécharger les métadonnées des chansons

## 🛠️ Développement

### Comment contribuer au projet ?
1. **Forkez** le repository
2. **Créez une branche** pour votre fonctionnalité
3. **Testez** localement
4. **Soumettez une Pull Request**

Consultez le [guide de contribution](../CONTRIBUTING.md) pour plus de détails.

### Comment ajouter de nouvelles fonctionnalités ?
**Architecture :**
- **Frontend** : Composants React dans `client/src/components/`
- **Backend** : Routes dans `server/routes/` et événements Socket.IO dans `server/socket/`
- **API** : Utilisez l'API Spotify via `axios`

**Bonnes pratiques :**
- Testez localement avant de déployer
- Documentez vos changements
- Respectez la structure existante

### L'application est-elle open source ?
**Oui**, le projet est sous licence MIT. Vous pouvez :
- Utiliser le code gratuitement
- Le modifier selon vos besoins
- Le redistribuer
- Contribuer aux améliorations

## 🔧 Performance

### L'application est lente
**Optimisations possibles :**
1. **Serveur** : Augmentez les ressources (CPU/RAM)
2. **Rate limiting** : Réduisez la fréquence des requêtes Spotify
3. **Cache** : Activez la mise en cache Nginx
4. **CDN** : Utilisez un CDN pour les assets statiques

### Trop de requêtes vers l'API Spotify
L'API Spotify limite à environ 100 requêtes/minute. Si vous dépassez :

**Solutions :**
1. **Augmentez les intervalles** dans `PlayerControls.js`
2. **Réduisez le nombre d'utilisateurs** simultanés
3. **Implementez un cache** pour les résultats de recherche

## 📞 Support

### Où obtenir de l'aide ?
1. **Wiki** : [Documentation complète](Home)
2. **Issues GitHub** : [Signaler un problème](https://github.com/5UP3RTH30B4G/spotify-connect/issues)
3. **Discussions** : [GitHub Discussions](https://github.com/5UP3RTH30B4G/spotify-connect/discussions)

### Comment signaler un bug ?
1. **Vérifiez** que ce n'est pas déjà signalé
2. **Fournissez** :
   - Version de Node.js
   - Système d'exploitation
   - Logs d'erreur
   - Étapes pour reproduire
3. **Créez une issue** avec toutes ces informations

### L'application ne marche plus après une mise à jour Spotify
Spotify met parfois à jour son API. Si quelque chose casse :
1. **Vérifiez** les issues GitHub pour des problèmes similaires
2. **Consultez** la documentation Spotify Developer
3. **Signalez** le problème avec des détails précis

---

## 🔍 Vous ne trouvez pas votre réponse ?

- 📖 **Wiki complet** : [Retour à l'accueil](Home)
- 🐛 **Troubleshooting** : [Guide de résolution](Troubleshooting)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/5UP3RTH30B4G/spotify-connect/discussions)
- 🚨 **Nouvelle issue** : [Créer une issue](https://github.com/5UP3RTH30B4G/spotify-connect/issues/new)