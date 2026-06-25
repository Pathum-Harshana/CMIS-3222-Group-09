INSERT INTO users (full_name, email, password_hash, role) VALUES
    ('Super Admin', 'superadmin@aurahub.local', '$2b$12$IaeJdZchqdkOAQ/rGPrK2uyf3xTho1GBIDo9zD1UlFuk36a3NgYkK', 'super_admin')
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    password_hash = VALUES(password_hash),
    role = VALUES(role);

INSERT INTO users (full_name, email, password_hash, role) VALUES
    ('Admin 1', 'admin1@aurahub.local', '$2b$12$bKnE5WxcZcaJgoTd6uMkQeWN4igD4efYURVgMH.d9AG8VXhF5j3wa', 'admin')
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    password_hash = VALUES(password_hash),
    role = VALUES(role);

UPDATE users
SET email = 'admin2@aurahub.local',
    password_hash = '$2b$12$8UrMcP/DXIi.b6AiPMyi9e0j8KBzkr4HLgTFtYEQBaCLcp2vR0uTe'
WHERE role = 'admin'
  AND (email = 'admin@aurahub.local' OR email = 'admin2@aurahub.local');
