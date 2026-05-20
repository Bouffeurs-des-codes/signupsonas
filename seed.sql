-- Création de la table employes_eligibles
-- Cette table sert de registre interne pour valider les matricules lors de l'inscription (Étape 1)

CREATE TABLE IF NOT EXISTS public.employes_eligibles (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  matricule text NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  postnom text,
  role text NOT NULL DEFAULT 'agent',
  agence_id text,
  est_inscrit boolean NOT NULL DEFAULT false, -- Passe à true une fois l'étape 2 complétée
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT employes_eligibles_pkey PRIMARY KEY (id),
  CONSTRAINT employes_eligibles_matricule_key UNIQUE (matricule),
  CONSTRAINT employes_eligibles_role_check CHECK (
    role = ANY (ARRAY['admin'::text, 'gestionnaire'::text, 'agent'::text])
  )
) TABLESPACE pg_default;

-- Insertion de données de test (Seed)
INSERT INTO public.employes_eligibles (matricule, nom, prenom, postnom, role, agence_id)
VALUES 
  ('MAT-1001', 'Kabila', 'Joseph', 'Tshilombo', 'agent', 'KIN-01'),
  ('MAT-1002', 'Lumumba', 'Patrice', 'Emery', 'gestionnaire', 'LUB-02'),
  ('MAT-1003', 'Tshisekedi', 'Felix', 'Antoine', 'admin', 'HQ-00')
ON CONFLICT (matricule) DO NOTHING;
