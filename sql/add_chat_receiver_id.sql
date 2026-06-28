ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS receiver_id INT NULL AFTER sender_id;

CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages (receiver_id);
