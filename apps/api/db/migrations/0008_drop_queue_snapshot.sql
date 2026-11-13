-- The migration runner supplies one transaction for this file.
DROP TRIGGER IF EXISTS trg_library_entry_bump_ins ON library_entry;

DROP TRIGGER IF EXISTS trg_library_entry_bump_del ON library_entry;

DROP TRIGGER IF EXISTS trg_library_entry_bump_upd ON library_entry;

DROP TRIGGER IF EXISTS trg_game_bump ON game;

DROP TRIGGER IF EXISTS trg_weights_bump ON user_score_weights;

DROP TRIGGER IF EXISTS trg_qma_bump ON queue_manual_adjustment;

DROP FUNCTION IF EXISTS trg_library_entry_bump_ins();

DROP FUNCTION IF EXISTS trg_library_entry_bump_del();

DROP FUNCTION IF EXISTS trg_library_entry_bump_upd();

DROP FUNCTION IF EXISTS trg_game_bump();

DROP FUNCTION IF EXISTS trg_user_row_bump();

DROP FUNCTION IF EXISTS bump_queue_version(uuid[]);

DROP VIEW IF EXISTS queue_freshness;

DROP TABLE IF EXISTS queue_snapshot_item;

DROP TABLE IF EXISTS queue_snapshot;

DROP TABLE IF EXISTS user_queue_state;
