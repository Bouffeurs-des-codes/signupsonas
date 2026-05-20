'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, UserPlus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from 'src/lib/supabase';
import { EmployeEligible, Utilisateur } from 'src/lib/types';

export default function Completion() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  const [employe, setEmploye] = useState<EmployeEligible | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Récupérer les données de l'employé vérifié
    const stored = localStorage.getItem('pending_verification');
    if (stored) {
      setEmploye(JSON.parse(stored));
    } else {
      // Rediriger vers l'étape 1 si aucune donnée n'est trouvée
      router.push('/verification');
    }
  }, [router]);

  const handleCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employe) return;
    if (!email || !password) {
      setMessage({ type: 'danger', text: 'Veuillez remplir tous les champs.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Mode simulation
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const storedUsers = localStorage.getItem('simulated_users');
        const users: Utilisateur[] = storedUsers ? JSON.parse(storedUsers) : [];

        if (users.some(u => u.email === email)) {
          setMessage({ type: 'danger', text: 'Cet e-mail est déjà utilisé.' });
          setLoading(false);
          return;
        }

        const newUser: Utilisateur = {
          id: employe.id || crypto.randomUUID(),
          email,
          mot_de_passe: password,
          nom: employe.nom,
          prenom: employe.prenom,
          postnom: employe.postnom,
          role: employe.role,
          agence_id: employe.agence_id,
          matricule: employe.matricule,
          created_at: new Date().toISOString()
        };

        const updatedUsers = [newUser, ...users];
        localStorage.setItem('simulated_users', JSON.stringify(updatedUsers));
        localStorage.removeItem('pending_verification');
        
        setMessage({ type: 'success', text: `Compte finalisé avec succès !` });
        
        setTimeout(() => {
          router.push('/verification');
        }, 3000);
      }, 1000);
      return;
    }

    // Mode Supabase
    try {
      // 1. Inscription Auth
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nom: employe.nom,
            prenom: employe.prenom,
            role: employe.role,
            agence_id: employe.agence_id,
            matricule: employe.matricule,
          }
        }
      });

      if (authError) throw authError;

      if (!signUpData.user) {
        throw new Error("La création du compte a échoué.");
      }

      // 2. Insertion dans public.utilisateurs
      const { error: profileError } = await supabase
        .from('utilisateurs')
        .insert({
          id: signUpData.user.id,
          email,
          mot_de_passe: password, // Requis par votre schéma (Attention à la sécurité en prod)
          nom: employe.nom,
          prenom: employe.prenom,
          postnom: employe.postnom,
          role: employe.role,
          agence_id: employe.agence_id,
          matricule: employe.matricule,
        });

      if (profileError) {
        throw new Error(`Erreur lors de la sauvegarde du profil : ${profileError.message}`);
      }

      // 3. Mise à jour de employes_eligibles pour marquer comme inscrit
      const { error: updateError } = await supabase
        .from('employes_eligibles')
        .update({ est_inscrit: true })
        .eq('matricule', employe.matricule);

      if (updateError) {
        console.warn("Le profil est créé, mais la mise à jour du statut d'éligibilité a échoué.", updateError);
      }

      // Nettoyage et redirection
      localStorage.removeItem('pending_verification');
      setMessage({ type: 'success', text: 'Compte finalisé avec succès !' });
      setTimeout(() => {
        router.push('/verification');
      }, 3000);

    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || "Une erreur est survenue lors de l'activation du compte." });
    } finally {
      setLoading(false);
    }
  };

  if (!employe) {
    return <main><div className="spinner" style={{ margin: 'auto' }}></div></main>;
  }

  return (
    <main>
      {message && (
        <div className={`alert alert-${message.type}`} style={{ width: '100%', maxWidth: '540px' }}>
          {message.type === 'warning' && <AlertTriangle className="alert-icon" />}
          {message.type === 'danger' && <AlertTriangle className="alert-icon" />}
          {message.type === 'success' && <CheckCircle className="alert-icon" />}
          <div>
            <strong>{message.type === 'success' ? 'Succès :' : 'Erreur :'} </strong>
            {message.text}
          </div>
        </div>
      )}

      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/sonas_logo.ico" alt="SONAS Logo" style={{ width: '80px', height: 'auto', marginBottom: '1rem' }} />
        </div>
        <h1 style={{ color: 'var(--primary)' }}>Bienvenue {employe.prenom} !</h1>
        <p className="subtitle">
          Étape 2 : Veuillez compléter les informations manquantes pour finaliser l'activation de votre compte.
        </p>

        <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <p><strong>Matricule :</strong> {employe.matricule}</p>
          <p><strong>Nom complet :</strong> {employe.prenom} {employe.nom} {employe.postnom || ''}</p>
          <p><strong>Rôle assigné :</strong> <span className={`badge badge-${employe.role}`}>{employe.role}</span></p>
        </div>

        <form onSubmit={handleCompletion}>
          <div className="form-group">
            <label htmlFor="reg-email"><Mail size={14} /> Adresse E-mail *</label>
            <div className="input-wrapper">
              <input
                id="reg-email"
                type="email"
                className="form-control"
                placeholder="votre.email@sonas.cd"
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
                placeholder="Créer un mot de passe (Min. 6 caractères)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Lock className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.75rem' }} disabled={loading}>
            {loading ? <div className="spinner"></div> : <><UserPlus size={18} /> Activer mon compte</>}
          </button>
        </form>
      </div>
    </main>
  );
}
