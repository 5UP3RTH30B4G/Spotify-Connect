// Gestionnaire de sessions pour permettre plusieurs utilisateurs simultanés
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  // Créer une nouvelle session
  createSession(sessionId, sessionData) {
    this.sessions.set(sessionId, {
      ...sessionData,
      createdAt: new Date(),
      lastAccess: new Date()
    });
    console.log(`💾 Session créée pour l'utilisateur ${sessionData.user?.display_name} - ID: ${sessionId}`);
  }

  // Récupérer une session
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccess = new Date();
      return session;
    }
    return null;
  }

  // Mettre à jour une session
  updateSession(sessionId, updates) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
      session.lastAccess = new Date();
      return session;
    }
    return null;
  }

  // Supprimer une session
  deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`🗑️ Session supprimée pour l'utilisateur ${session.user?.display_name} - ID: ${sessionId}`);
      return this.sessions.delete(sessionId);
    }
    return false;
  }

  // Nettoyer les sessions expirées
  cleanExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 heures par défaut
    const now = new Date();
    let cleaned = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccess > maxAge) {
        this.deleteSession(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} sessions expirées nettoyées`);
    }
    
    return cleaned;
  }

  // Obtenir toutes les sessions actives
  getActiveSessions() {
    return Array.from(this.sessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      user: session.user,
      lastAccess: session.lastAccess,
      createdAt: session.createdAt
    }));
  }

  // Statistiques
  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: this.getActiveSessions()
    };
  }
}

// Instance singleton
const sessionManager = new SessionManager();

// Nettoyage automatique toutes les heures
setInterval(() => {
  sessionManager.cleanExpiredSessions();
}, 60 * 60 * 1000);

module.exports = sessionManager;