-- Add working_hours (JSONB) to employees for per-employee availability.
-- Same shape as business_settings.working_hours: [{ day, open, close, isClosed }, ...]
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS working_hours jsonb DEFAULT NULL;

COMMENT ON COLUMN public.employees.working_hours IS 'Per-employee schedule: array of { day, open, close, isClosed } for each weekday.';
