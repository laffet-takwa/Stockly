PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE COLLATE NOCASE,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
    unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS movements (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_product_id ON movements(product_id);

INSERT OR IGNORE INTO products (id, name, sku, category, quantity, min_quantity, unit_price) VALUES
    ('demo-001', 'Casque Studio Pro', 'AUD-2401', 'Électronique', 24, 8, 89.90),
    ('demo-002', 'Lampe de bureau Halo', 'MAI-1830', 'Maison', 6, 10, 42.00),
    ('demo-003', 'Carnet Horizon A5', 'PAP-5002', 'Papeterie', 73, 20, 8.50),
    ('demo-004', 'Sac week-end Canvas', 'ACC-0922', 'Accessoires', 0, 5, 64.00),
    ('demo-005', 'Clavier mécanique 75%', 'ELE-7713', 'Électronique', 18, 6, 119.00),
    ('demo-006', 'Bouteille Isotherme 750 ml', 'MAI-6430', 'Maison', 31, 10, 27.50),
    ('demo-007', 'Support ordinateur pliable', 'ACC-3308', 'Accessoires', 4, 8, 35.00),
    ('demo-008', 'Stylo bille Studio', 'PAP-1516', 'Papeterie', 112, 30, 3.90);

INSERT OR IGNORE INTO movements (id, product_id, product_name, sku, movement_type, quantity, note, created_at) VALUES
    ('move-demo-001', 'demo-001', 'Casque Studio Pro', 'AUD-2401', 'in', 12, 'Réception fournisseur', datetime('now', '-1 hour')),
    ('move-demo-002', 'demo-002', 'Lampe de bureau Halo', 'MAI-1830', 'out', 3, 'Commande client', datetime('now', '-4 hours')),
    ('move-demo-003', 'demo-003', 'Carnet Horizon A5', 'PAP-5002', 'in', 40, 'Réassort papeterie', datetime('now', '-1 day')),
    ('move-demo-004', 'demo-005', 'Clavier mécanique 75%', 'ELE-7713', 'out', 2, 'Commande client', datetime('now', '-2 days')),
    ('move-demo-005', 'demo-006', 'Bouteille Isotherme 750 ml', 'MAI-6430', 'in', 16, 'Réception fournisseur', datetime('now', '-3 days'));