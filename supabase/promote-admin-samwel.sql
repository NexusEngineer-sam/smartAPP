-- One-time owner promotion for SAMWEL CAMPUS OS.
-- Run in Supabase SQL Editor after confirming this is the intended project.
-- This application currently supports ADMIN (not a separate SUPER_ADMIN enum value).
DO $$
DECLARE
  changed_rows integer;
BEGIN
  UPDATE "User"
     SET "role" = 'ADMIN'::"UserRole",
         "isActive" = true,
         "updatedAt" = CURRENT_TIMESTAMP
   WHERE lower("email") = lower('samweljastin93@gmail.com');

  GET DIAGNOSTICS changed_rows = ROW_COUNT;

  IF changed_rows = 0 THEN
    RAISE EXCEPTION 'No account found for samweljastin93@gmail.com. Sign up first using this exact email, then rerun this script.';
  END IF;

  RAISE NOTICE 'Admin role assigned to samweljastin93@gmail.com.';
END $$;
