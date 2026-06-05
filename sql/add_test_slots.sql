-- Add a test slot for lecturer_id 4
INSERT INTO mentor_availability (lecturer_id, available_date, start_time, end_time, note, is_active)
VALUES (4, CURDATE() + INTERVAL 1 DAY, '10:00', '11:00', 'Test slot', 1);

-- Add a test slot for lecturer_id 5
INSERT INTO mentor_availability (lecturer_id, available_date, start_time, end_time, note, is_active)
VALUES (5, CURDATE() + INTERVAL 2 DAY, '14:00', '15:00', 'Test slot', 1);
