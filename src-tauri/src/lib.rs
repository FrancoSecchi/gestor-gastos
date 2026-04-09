mod commands;

use tauri_plugin_sql::{Migration, MigrationKind};

pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS transactions (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
                    amount REAL NOT NULL,
                    amount_usd REAL,
                    category TEXT NOT NULL,
                    subcategory TEXT,
                    description TEXT,
                    date TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                INSERT OR IGNORE INTO settings (key, value) VALUES ('initialized', 'false');
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_subtype_column",
            sql: "
                ALTER TABLE transactions ADD COLUMN subtype TEXT;
                UPDATE transactions SET subtype = 'transfer_to_savings' WHERE category IN ('Ahorro', 'Inversión') AND type = 'expense';
                UPDATE transactions SET subtype = 'transfer_from_savings' WHERE category IN ('Retiro de ahorro') AND type = 'income';
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:gastos.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
