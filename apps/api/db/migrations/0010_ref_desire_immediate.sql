-- The migration runner supplies one transaction for this file.
INSERT INTO ref_desire (code, label_pt, points, sort_order) VALUES
  ('immediate', 'Imediata', 100, 0)
ON CONFLICT (code) DO UPDATE SET label_pt = EXCLUDED.label_pt,
  points = EXCLUDED.points, sort_order = EXCLUDED.sort_order;
