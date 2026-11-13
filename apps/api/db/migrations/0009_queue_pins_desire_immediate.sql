-- The migration runner supplies one transaction for this file.
ALTER TYPE desire_level ADD VALUE IF NOT EXISTS 'immediate' BEFORE 'very_high';

UPDATE queue_manual_adjustment
   SET manual_position = NULL
 WHERE flat_points = 0 AND manual_position IS NOT NULL;

UPDATE queue_manual_adjustment
   SET flat_points = 0
 WHERE flat_points <> 0;

COMMENT ON COLUMN queue_manual_adjustment.manual_position IS
  'Pin: posição fixada pelo usuário na fila (NULL = sem pin).';

COMMENT ON COLUMN queue_manual_adjustment.flat_points IS
  'Legado (pontos manuais, antes dos pins); sempre 0.';
