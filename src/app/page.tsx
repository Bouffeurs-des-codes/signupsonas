'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Users, 
  Shield, 
  Building, 
  LogIn, 
  LogOut, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from 'src/lib/supabase';
import { Utilisateur, UserRole } from 'src/lib/types';

export default function Home() {
  // Screens: 'signin' | 'signup' | 'dashboard'
  const [screen, setScreen] = useState<'signin' | 'signup' | 'dashboard'>('signin');
  
  // Loading & Messages
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [postnom, setPostnom] = useState('');
  const [role, setRole] = useState<UserRole>('agent');
  const [agenceId, setAgenceId] = useState('');

  // Active Session User Profile
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  // List of users (fetched or simulated)
  const [usersList, setUsersList] = useState<Utilisateur[]>([]);

  // Show simulation warning if Supabase is not configured
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage({
        type: 'warning',
        text: "Supabase n'est pas encore configuré (variables d'environnement manquantes). L'application fonctionne actuellement en mode simulation locale."
      });
      // Load simulated users from local storage if available
      const stored = localStorage.getItem('simulated_users');
      if (stored) {
        setUsersList(JSON.parse(stored));
      }
    } else {
      // Check active Supabase session
      checkActiveSession();
    }
  }, []);

  const checkActiveSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch profile
        const { data: profile, error } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setCurrentUser(profile);
          setScreen('dashboard');
          fetchUsersList();
        } else {
          // If profile table doesn't have the user record, use auth metadata fallback
          const fallbackUser: Utilisateur = {
            id: session.user.id,
            email: session.user.email || '',
            mot_de_passe: '********',
            nom: session.user.user_metadata?.nom || 'Inconnu',
            prenom: session.user.user_metadata?.prenom || 'Utilisateur',
            role: session.user.user_metadata?.role || 'agent',
            agence_id: session.user.user_metadata?.agence_id || null,
          };
          setCurrentUser(fallbackUser);
          setScreen('dashboard');
        }
      }
    } catch (err) {
      console.error("Session check error:", err);
    }
  };

  const fetchUsersList = async () => {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('simulated_users');
      if (stored) {
        setUsersList(JSON.parse(stored));
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('id, email, nom, prenom, postnom, role, agence_id, created_at')
        .order('created_at', { ascending: false });

      if (data) {
        setUsersList(data as Utilisateur[]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  // Sign In Action
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'danger', text: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // --- MODE SIMULÉ ---
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const stored = localStorage.getItem('simulated_users');
        const users: Utilisateur[] = stored ? JSON.parse(stored) : [];
        
        const matchedUser = users.find(u => u.email === email && u.mot_de_passe === password);
        if (matchedUser) {
          setCurrentUser(matchedUser);
          setScreen('dashboard');
          setUsersList(users);
          setMessage({ type: 'success', text: `Bienvenue, ${matchedUser.prenom} ! Connexion réussie en mode simulation.` });
        } else {
          // If no users found, allow a default fallback login for testing
          if (email === 'admin@sonas.cd' && password === 'admin123') {
            const defaultAdmin: Utilisateur = {
              email: 'admin@sonas.cd',
              mot_de_passe: 'admin123',
              nom: 'SONAS',
              prenom: 'Admin',
              role: 'admin',
              agence_id: 'HQ-KIN'
            };
            setCurrentUser(defaultAdmin);
            setScreen('dashboard');
            // Save to list
            const newUsers = [defaultAdmin, ...users];
            localStorage.setItem('simulated_users', JSON.stringify(newUsers));
            setUsersList(newUsers);
            setMessage({ type: 'success', text: "Bienvenue ! Compte administrateur par défaut connecté." });
          } else {
            setMessage({ type: 'danger', text: 'Identifiants invalides (ou utilisateur inexistant).' });
          }
        }
        setLoading(false);
      }, 800);
      return;
    }

    // --- MODE SUPABASE ---
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch Profile from public.utilisateurs
        const { data: profile, error: profileError } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.warn("Profil introuvable dans la table utilisateurs, utilisation des métadonnées Auth.");
        }

        const loggedInUser: Utilisateur = profile || {
          id: data.user.id,
          email: data.user.email || '',
          mot_de_passe: '********',
          nom: data.user.user_metadata?.nom || 'Utilisateur',
          prenom: data.user.user_metadata?.prenom || '',
          role: data.user.user_metadata?.role || 'agent',
          agence_id: data.user.user_metadata?.agence_id || null,
        };

        setCurrentUser(loggedInUser);
        setScreen('dashboard');
        await fetchUsersList();
        setMessage({ type: 'success', text: 'Connexion réussie.' });
      }
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || 'Une erreur est survenue lors de la connexion.' });
    } finally {
      setLoading(false);
    }
  };

  // Sign Up / Register Action
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nom || !prenom || !role) {
      setMessage({ type: 'danger', text: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // --- MODE SIMULÉ ---
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const stored = localStorage.getItem('simulated_users');
        const users: Utilisateur[] = stored ? JSON.parse(stored) : [];

        // Check if email already exists
        if (users.some(u => u.email === email)) {
          setMessage({ type: 'danger', text: 'Cet e-mail est déjà utilisé.' });
          setLoading(false);
          return;
        }

        const newUser: Utilisateur = {
          id: crypto.randomUUID(),
          email,
          mot_de_passe: password, // In simulated mode, we store password to verify it later
          nom,
          prenom,
          postnom: postnom || null,
          role,
          agence_id: agenceId || null,
          created_at: new Date().toISOString()
        };

        const updatedUsers = [newUser, ...users];
        localStorage.setItem('simulated_users', JSON.stringify(updatedUsers));
        setUsersList(updatedUsers);
        
        setMessage({ type: 'success', text: `Compte créé avec succès pour ${prenom} ${nom} ! Connectez-vous maintenant.` });
        
        // Reset inputs
        resetForm();
        setScreen('signin');
        setLoading(false);
      }, 1000);
      return;
    }

    // --- MODE SUPABASE ---
    try {
      // 1. Sign up user in Supabase Auth
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom,
            prenom,
            role,
            agence_id: agenceId || null,
          }
        }
      });

      if (authError) throw authError;

      if (!signUpData.user) {
        throw new Error("L'inscription a échoué. Veuillez vérifier les informations saisies.");
      }

      // 2. Insert profile details into public.utilisateurs table
      const { error: profileError } = await supabase
        .from('utilisateurs')
        .insert({
          id: signUpData.user.id,
          email,
          mot_de_passe: password, // As requested in the SQL schema
          nom,
          prenom,
          postnom: postnom || null,
          role,
          agence_id: agenceId || null,
        });

      if (profileError) {
        console.error("Erreur de synchronisation du profil:", profileError);
        // Inform user that auth succeeded but profile insert had an issue (could be RLS policies)
        setMessage({ 
          type: 'warning', 
          text: `Utilisateur créé dans l'authentification, mais l'enregistrement du profil dans la table 'utilisateurs' a échoué : ${profileError.message}` 
        });
      } else {
        setMessage({ type: 'success', text: 'Compte utilisateur créé avec succès dans Supabase !' });
        resetForm();
        setScreen('signin');
      }
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || "Une erreur est survenue lors de l'inscription." });
    } finally {
      setLoading(false);
    }
  };

  // Sign Out Action
  const handleSignOut = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setScreen('signin');
    setMessage({ type: 'success', text: 'Déconnexion effectuée avec succès.' });
    setLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setNom('');
    setPrenom('');
    setPostnom('');
    setRole('agent');
    setAgenceId('');
  };

  return (
    <main>
      {/* Simulation Banner & Setup Guide */}
      {message && (
        <div className={`alert alert-${message.type}`} style={{ width: '100%', maxWidth: screen === 'dashboard' ? '900px' : '540px' }}>
          {message.type === 'warning' && <AlertTriangle className="alert-icon" />}
          {message.type === 'danger' && <AlertTriangle className="alert-icon" />}
          {message.type === 'success' && <CheckCircle className="alert-icon" />}
          <div>
            <strong>{message.type === 'warning' ? 'Configuration :' : message.type === 'danger' ? 'Erreur :' : 'Succès :'} </strong>
            {message.text}
            {!isSupabaseConfigured && screen === 'signin' && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.85 }}>
                <p>💡 <strong>Note de test :</strong> Connectez-vous avec l'e-mail <code>admin@sonas.cd</code> et le mot de passe <code>admin123</code> pour démarrer directement avec un compte administrateur simulé.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 1: Sign In */}
      {screen === 'signin' && (
        <div className="glass-card">
          <h1>Connexion</h1>
          <p className="subtitle">Accédez à votre espace agents & gestionnaires</p>
          
          <form onSubmit={handleSignIn}>
            <div className="form-group">
              <label htmlFor="email"><Mail size={14} /> E-mail</label>
              <div className="input-wrapper">
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="exemple@sonas.cd"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password"><Lock size={14} /> Mot de passe</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="input-icon" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="spinner"></div> : <><LogIn size={18} /> Se connecter</>}
            </button>
          </form>

          <div className="auth-toggle">
            Nouveau sur la plateforme ?
            <button className="auth-toggle-btn" onClick={() => { resetForm(); setScreen('signup'); setMessage(null); }}>
              Créer un compte
            </button>
          </div>
        </div>
      )}

      {/* Screen 2: Sign Up */}
      {screen === 'signup' && (
        <div className="glass-card">
          <h1>Inscription</h1>
          <p className="subtitle">Enregistrez un nouveau compte utilisateur</p>

          <form onSubmit={handleSignUp}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prenom"><User size={14} /> Prénom *</label>
                <div className="input-wrapper">
                  <input
                    id="prenom"
                    type="text"
                    className="form-control"
                    placeholder="Jean"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                  />
                  <User className="input-icon" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="nom"><User size={14} /> Nom *</label>
                <div className="input-wrapper">
                  <input
                    id="nom"
                    type="text"
                    className="form-control"
                    placeholder="Kabila"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                  <User className="input-icon" />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="postnom"><User size={14} /> Postnom (Optionnel)</label>
              <div className="input-wrapper">
                <input
                  id="postnom"
                  type="text"
                  className="form-control"
                  placeholder="Mulumba"
                  value={postnom}
                  onChange={(e) => setPostnom(e.target.value)}
                />
                <User className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email"><Mail size={14} /> Adresse E-mail *</label>
              <div className="input-wrapper">
                <input
                  id="reg-email"
                  type="email"
                  className="form-control"
                  placeholder="nom.prenom@sonas.cd"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password"><Lock size={14} /> Mot de passe *</label>
              <div className="input-wrapper">
                <input
                  id="reg-password"
                  type="password"
                  className="form-control"
                  placeholder="Min. 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="input-icon" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="role"><Shield size={14} /> Rôle *</label>
                <div className="input-wrapper">
                  <select
                    id="role"
                    className="form-control"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    required
                  >
                    <option value="agent">Agent</option>
                    <option value="gestionnaire">Gestionnaire</option>
                    <option value="admin">Administrateur</option>
                  </select>
                  <Shield className="input-icon" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="agenceId"><Building size={14} /> Agence ID (Optionnel)</label>
                <div className="input-wrapper">
                  <input
                    id="agenceId"
                    type="text"
                    className="form-control"
                    placeholder="GOMBE-01"
                    value={agenceId}
                    onChange={(e) => setAgenceId(e.target.value)}
                  />
                  <Building className="input-icon" />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.75rem' }} disabled={loading}>
              {loading ? <div className="spinner"></div> : <><UserPlus size={18} /> Créer l'utilisateur</>}
            </button>
          </form>

          <div className="auth-toggle">
            Déjà inscrit ?
            <button className="auth-toggle-btn" onClick={() => { resetForm(); setScreen('signin'); setMessage(null); }}>
              Se connecter
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Dashboard */}
      {screen === 'dashboard' && currentUser && (
        <div className="glass-card dashboard-card">
          <div className="dashboard-header">
            <div className="dashboard-user-info">
              <div className="avatar">
                {currentUser.prenom[0].toUpperCase()}{currentUser.nom[0].toUpperCase()}
              </div>
              <div>
                <h2>{currentUser.prenom} {currentUser.nom} {currentUser.postnom && currentUser.postnom}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge badge-${currentUser.role}`}>{currentUser.role}</span>
                  {currentUser.agence_id && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      📍 Agence: {currentUser.agence_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={handleSignOut}>
              <LogOut size={16} /> Déconnexion
            </button>
          </div>

          <div className="dashboard-grid">
            {/* Left: Actions */}
            <div>
              <h3>Créer un nouveau compte</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                En tant que membre connecté, vous pouvez ajouter d'autres profils d'utilisateurs.
              </p>
              
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  resetForm();
                  setScreen('signup');
                  setMessage(null);
                }}
              >
                <UserPlus size={18} /> Nouveau Formulaire
              </button>
            </div>

            {/* Right: User list */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Comptes enregistrés</h3>
                <button 
                  onClick={fetchUsersList}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} /> Rafraîchir
                </button>
              </div>

              {usersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--card-border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <Info size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>Aucun autre utilisateur enregistré pour le moment.</p>
                </div>
              ) : (
                <div className="users-list">
                  {usersList.map((user, idx) => (
                    <div key={user.id || idx} className="user-item">
                      <div className="user-item-info">
                        <span className="user-name">
                          {user.prenom} {user.nom} {user.postnom && `(${user.postnom})`}
                        </span>
                        <span className="user-meta">{user.email}</span>
                        {user.agence_id && <span className="user-meta">Agence: {user.agence_id}</span>}
                      </div>
                      <div>
                        <span className={`badge badge-${user.role}`}>{user.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
