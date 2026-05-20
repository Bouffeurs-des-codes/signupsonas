'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, UserPlus, RefreshCw, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from 'src/lib/supabase';
import { Utilisateur } from 'src/lib/types';

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Utilisateur | null>(null);
  const [usersList, setUsersList] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('simulated_session_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
        fetchUsersList();
      } else {
        router.push('/login');
      }
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          if (profile.role !== 'admin') {
            router.push('/login');
            return;
          }
          setCurrentUser(profile);
        } else {
          const fallbackRole = session.user.user_metadata?.role;
          if (fallbackRole !== 'admin') {
            router.push('/login');
            return;
          }
          const fallbackUser: Utilisateur = {
            id: session.user.id,
            email: session.user.email || '',
            mot_de_passe: '********',
            nom: session.user.user_metadata?.nom || 'Inconnu',
            prenom: session.user.user_metadata?.prenom || 'Utilisateur',
            role: 'admin',
            agence_id: session.user.user_metadata?.agence_id || null,
          };
          setCurrentUser(fallbackUser);
        }
        fetchUsersList();
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error("Session check error:", err);
      router.push('/login');
    } finally {
      setLoading(false);
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
        .select('id, email, nom, prenom, postnom, role, agence_id, matricule, created_at')
        .order('created_at', { ascending: false });

      if (data) {
        setUsersList(data as Utilisateur[]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('simulated_session_user');
    }
    setCurrentUser(null);
    router.push('/login');
  };

  if (loading) {
    return <main><div className="glass-card" style={{ textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div></main>;
  }

  if (!currentUser) return null;

  return (
    <main>
      <div className="glass-card dashboard-card">
        <div className="dashboard-header">
          <div className="dashboard-user-info">
            <div className="avatar">
              {currentUser.prenom[0]?.toUpperCase()}{currentUser.nom[0]?.toUpperCase()}
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
                {currentUser.matricule && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    # {currentUser.matricule}
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
            <h3>Activer un compte</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              La création de compte se fait via la page d'activation sécurisée des employés.
            </p>
            
            <button 
              className="btn btn-primary" 
              onClick={() => router.push('/verification')}
            >
              <UserPlus size={18} /> Activer un compte
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
                      {user.matricule && <span className="user-meta">Matricule: {user.matricule}</span>}
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
    </main>
  );
}
