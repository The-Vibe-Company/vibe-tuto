-- Dashboard performance: composite index + dedicated RPC.
--
-- Replaces the joined `/api/tutorials` query that fetched every source row
-- per tutorial just to pick a thumbnail. The RPC returns one row per
-- tutorial with the step count and the first source's screenshot path
-- (by order_index) using LATERAL subqueries.

CREATE INDEX IF NOT EXISTS idx_tutorials_user_id_created_at
  ON tutorials (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION get_user_dashboard_tutorials(
  p_limit  integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id              uuid,
  title           text,
  slug            text,
  status          text,
  visibility      text,
  created_at      timestamptz,
  steps_count     bigint,
  thumbnail_path  text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.title,
    t.slug,
    t.status,
    t.visibility,
    t.created_at,
    COALESCE(sc.steps_count, 0) AS steps_count,
    th.screenshot_url           AS thumbnail_path
  FROM tutorials t
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS steps_count
    FROM steps s
    WHERE s.tutorial_id = t.id
  ) sc ON TRUE
  LEFT JOIN LATERAL (
    SELECT src.screenshot_url
    FROM sources src
    WHERE src.tutorial_id = t.id
      AND src.screenshot_url IS NOT NULL
    ORDER BY src.order_index ASC
    LIMIT 1
  ) th ON TRUE
  WHERE t.user_id = auth.uid()
  ORDER BY t.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_user_dashboard_tutorials(integer, integer)
  TO authenticated;
