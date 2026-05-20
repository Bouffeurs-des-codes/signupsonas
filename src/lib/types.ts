export type UserRole = 'admin' | 'gestionnaire' | 'agent';

export interface Utilisateur {
  id?: string;
  email: string;
  mot_de_passe: string;
  nom: string;
  prenom: string;
  postnom?: string | null;
  role: UserRole;
  agence_id?: string | null;
  matricule?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeEligible {
  id?: string;
  matricule: string;
  nom: string;
  prenom: string;
  postnom?: string | null;
  role: UserRole;
  agence_id?: string | null;
  est_inscrit: boolean;
  created_at?: string;
}
