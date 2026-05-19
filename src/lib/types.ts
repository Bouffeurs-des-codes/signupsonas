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
  created_at?: string;
  updated_at?: string;
}
