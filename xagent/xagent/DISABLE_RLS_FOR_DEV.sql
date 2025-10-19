-- Temporarily disable RLS for development
-- This allows the dev fallback user to access these tables

-- ============================================
-- OPTION 1: Add policies for anon users (RECOMMENDED)
-- ============================================

-- Customer Journeys - Allow anon users (development only)
CREATE POLICY "Anon users can view journeys (DEV)"
  ON public.customer_journeys FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can create journeys (DEV)"
  ON public.customer_journeys FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update journeys (DEV)"
  ON public.customer_journeys FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Anon users can delete journeys (DEV)"
  ON public.customer_journeys FOR DELETE
  TO anon
  USING (true);

-- Collective Learnings - Allow anon users (development only)
CREATE POLICY "Anon users can view learnings (DEV)"
  ON public.collective_learnings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can create learnings (DEV)"
  ON public.collective_learnings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update learnings (DEV)"
  ON public.collective_learnings FOR UPDATE
  TO anon
  USING (true);

-- Agent Learning Profiles - Allow anon users
CREATE POLICY "Anon users can view profiles (DEV)"
  ON public.agent_learning_profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can create profiles (DEV)"
  ON public.agent_learning_profiles FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon users can update profiles (DEV)"
  ON public.agent_learning_profiles FOR UPDATE
  TO anon
  USING (true);

-- Learning Application Log - Allow anon users
CREATE POLICY "Anon users can view logs (DEV)"
  ON public.learning_application_log FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can create logs (DEV)"
  ON public.learning_application_log FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================
-- OPTION 2: Completely disable RLS (LESS SECURE)
-- Run this ONLY if Option 1 doesn't work
-- ============================================

-- UNCOMMENT THESE LINES IF NEEDED:
-- ALTER TABLE public.customer_journeys DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.collective_learnings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.agent_learning_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.learning_application_log DISABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANTS for anon role
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_journeys TO anon;
GRANT SELECT, INSERT, UPDATE ON public.collective_learnings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.agent_learning_profiles TO anon;
GRANT SELECT, INSERT ON public.learning_application_log TO anon;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'RLS Policies Added Successfully!' as status;

