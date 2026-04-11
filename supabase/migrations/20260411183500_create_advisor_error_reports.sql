-- Create advisor_error_reports table
CREATE TABLE IF NOT EXISTS public.advisor_error_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    chat_history JSONB NOT NULL,
    financial_context JSONB NOT NULL,
    user_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.advisor_error_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own error reports"
    ON public.advisor_error_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own error reports"
    ON public.advisor_error_reports
    FOR SELECT
    USING (auth.uid() = user_id);
