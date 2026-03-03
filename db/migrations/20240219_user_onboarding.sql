-- user_onboarding tablosu (State Machine)
CREATE TABLE IF NOT EXISTS public.user_onboarding (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    current_step TEXT DEFAULT 'INIT',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_user_onboarding_is_completed ON public.user_onboarding(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_current_step ON public.user_onboarding(current_step);

-- RLS Politikaları
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding state" 
    ON public.user_onboarding FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding state" 
    ON public.user_onboarding FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding state" 
    ON public.user_onboarding FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- trigger for updated_at (if not already defined for handle_updated_at)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
        CREATE FUNCTION public.handle_updated_at()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.user_onboarding;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Provide a function to initialize onboarding
CREATE OR REPLACE FUNCTION public.initialize_user_onboarding(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_onboarding (user_id, current_step)
    VALUES (p_user_id, 'INIT')
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
