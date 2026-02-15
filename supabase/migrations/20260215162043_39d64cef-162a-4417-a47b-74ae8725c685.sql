
CREATE TABLE public.flight_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  depart_date DATE NOT NULL,
  return_date DATE,
  cabin_class TEXT NOT NULL DEFAULT 'economy',
  adults INT NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'EUR',
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can read price history (public data)
CREATE POLICY "Price history is publicly readable"
  ON public.flight_price_history FOR SELECT USING (true);

-- Only service role / edge functions insert (via anon for now)
CREATE POLICY "Allow anonymous price history inserts"
  ON public.flight_price_history FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_price_history_route ON public.flight_price_history (origin, destination, depart_date, cabin_class, adults, currency);
