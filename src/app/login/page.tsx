'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from 'src/lib/supabase';
import { Utilisateur } from 'src/lib/types';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage({
        type: 'warning',
        text: "Supabase n'est pas encore configuré (variables d'environnement manquantes). L'application fonctionne en mode simulation."
      });
    } else {
      // Check active session on load
      checkSession();
    }
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/dashboard');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ type: 'danger', text: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Mode Simulé
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const stored = localStorage.getItem('simulated_users');
        const users: Utilisateur[] = stored ? JSON.parse(stored) : [];
        
        const matchedUser = users.find(u => u.email === email && u.mot_de_passe === password);
        if (matchedUser) {
          localStorage.setItem('simulated_session_user', JSON.stringify(matchedUser));
          router.push('/dashboard');
        } else {
          if (email === 'admin@sonas.cd' && password === 'admin123') {
            const defaultAdmin: Utilisateur = {
              email: 'admin@sonas.cd',
              mot_de_passe: 'admin123',
              nom: 'SONAS',
              prenom: 'Admin',
              role: 'admin',
              agence_id: 'HQ-KIN'
            };
            const newUsers = [defaultAdmin, ...users];
            localStorage.setItem('simulated_users', JSON.stringify(newUsers));
            localStorage.setItem('simulated_session_user', JSON.stringify(defaultAdmin));
            router.push('/dashboard');
          } else {
            setMessage({ type: 'danger', text: 'Identifiants invalides (ou utilisateur inexistant).' });
          }
        }
        setLoading(false);
      }, 800);
      return;
    }

    // Mode Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch Profile from public.utilisateurs to check role
        const { data: profile, error: profileError } = await supabase
          .from('utilisateurs')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const role = profile?.role || data.user.user_metadata?.role;

        if (role === 'admin') {
          setMessage({ type: 'success', text: 'Connexion réussie. Redirection vers le tableau de bord...' });
          router.push('/dashboard');
        } else {
          // L'utilisateur n'est pas admin, on bloque l'accès au dashboard
          // Optionnel: on le déconnecte car la plateforme n'a pas d'espace non-admin pour le moment
          await supabase.auth.signOut();
          setMessage({ type: 'warning', text: "Connexion réussie, mais le tableau de bord est strictement réservé aux administrateurs." });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || 'Une erreur est survenue lors de la connexion.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      {message && (
        <div className={`alert alert-${message.type}`} style={{ width: '100%', maxWidth: '540px' }}>
          {message.type === 'warning' && <AlertTriangle className="alert-icon" />}
          {message.type === 'danger' && <AlertTriangle className="alert-icon" />}
          {message.type === 'success' && <CheckCircle className="alert-icon" />}
          <div>
            <strong>{message.type === 'warning' ? 'Configuration :' : message.type === 'danger' ? 'Erreur :' : 'Succès :'} </strong>
            {message.text}
            {!isSupabaseConfigured && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.85 }}>
                <p>💡 <strong>Note de test :</strong> Connectez-vous avec <code>admin@sonas.cd</code> et <code>admin123</code></p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/sonas_logo.ico" alt="SONAS Logo" style={{ width: '80px', height: 'auto', marginBottom: '1rem' }} />
        </div>
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
          <button className="auth-toggle-btn" onClick={() => router.push('/register')}>
            Créer un compte
          </button>
        </div>
      </div>
    </main>
  );
}
