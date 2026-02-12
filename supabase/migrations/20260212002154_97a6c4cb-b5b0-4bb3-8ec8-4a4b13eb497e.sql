
-- Click tracking for monetization analytics
CREATE TABLE public.flight_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  airline TEXT,
  price NUMERIC,
  currency TEXT,
  origin TEXT,
  destination TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public insert, no auth required for anonymous tracking)
ALTER TABLE public.flight_clicks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (tracking clicks without auth)
CREATE POLICY "Allow anonymous click inserts"
  ON public.flight_clicks
  FOR INSERT
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE for anonymous users (admin only via service role)
