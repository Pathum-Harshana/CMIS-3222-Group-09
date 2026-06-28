CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_booking FOREIGN KEY (booking_id) REFERENCES session_bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat_booking_created (booking_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
