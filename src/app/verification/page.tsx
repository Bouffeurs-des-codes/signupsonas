'use client';

import React, { useState } from 'react';
import { User, Hash, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from 'src/lib/supabase';
import { EmployeEligible } from 'src/lib/types';

export default function Verification() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  const [nomComplet, setNomComplet] = useState('');
  const [matricule, setMatricule] = useState('');

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomComplet || !matricule) {
      setMessage({ type: 'danger', text: 'Veuillez remplir tous les champs.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Extraction du nom (première partie du nom complet pour simplifier la recherche)
    const nomPart = nomComplet.split(' ')[0].trim();

    if (!isSupabaseConfigured) {
      // Mode simulation
      setTimeout(() => {
        if (matricule === 'MAT-1001') {
          const simUser: EmployeEligible = {
            matricule: 'MAT-1001',
            nom: 'Kabila',
            prenom: 'Joseph',
            postnom: 'Tshilombo',
            role: 'agent',
            agence_id: 'KIN-01',
            est_inscrit: false
          };
          localStorage.setItem('pending_verification', JSON.stringify(simUser));
          router.push('/completion');
        } else {
          setMessage({ type: 'danger', text: "Vos données n'ont pas été trouvées ou votre compte est déjà activé. Veuillez contacter l'administrateur." });
        }
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employes_eligibles')
        .select('*')
        .eq('matricule', matricule)
        .ilike('nom', `${nomPart}%`)
        .single();

      if (error || !data) {
        throw new Error("Vos informations ne correspondent à aucun dossier d'employé en attente.");
      }

      if (data.est_inscrit) {
        throw new Error("Ce compte a déjà été activé. Veuillez vous connecter.");
      }

      // Succès
      localStorage.setItem('pending_verification', JSON.stringify(data));
      router.push('/completion');
      
    } catch (err: any) {
      setMessage({ type: 'danger', text: err.message || "Erreur de vérification." });
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
            <strong>{message.type === 'warning' ? 'Attention :' : message.type === 'danger' ? 'Erreur :' : 'Succès :'} </strong>
            {message.text}
            {!isSupabaseConfigured && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.85 }}>
                <p>💡 <strong>Note de test :</strong> Entrez <code>Kabila</code> et <code>MAT-1001</code> pour tester.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/sonas_logo.ico" alt="SONAS Logo" style={{ width: '80px', height: 'auto', marginBottom: '1rem' }} />
        </div>
        <h1>Vérification d'identité</h1>
        <p className="subtitle">Étape 1 : Vérification de votre statut d'employé</p>

        <form onSubmit={handleVerification}>
          <div className="form-group">
            <label htmlFor="nomComplet"><User size={14} /> Nom Complet</label>
            <div className="input-wrapper">
              <input
                id="nomComplet"
                type="text"
                className="form-control"
                placeholder="Ex: Kabila Joseph"
                value={nomComplet}
                onChange={(e) => setNomComplet(e.target.value)}
                required
              />
              <User className="input-icon" />
            </div>
            <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
              Entrez votre nom tel qu'il figure sur vos documents RH.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="matricule"><Hash size={14} /> Matricule</label>
            <div className="input-wrapper">
              <input
                id="matricule"
                type="text"
                className="form-control"
                placeholder="Ex: MAT-12345"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                required
              />
              <Hash className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <div className="spinner"></div> : <>Vérifier mes informations <ArrowRight size={18} /></>}
          </button>
        </form>

      </div>
    </main>
  );
}
