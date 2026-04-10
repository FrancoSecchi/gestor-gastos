mod commands;

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
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
                UPDATE transactions SET subtype = 'transfer_to_savings' WHERE category IN ('Ahorro', 'Inversión', NULL) AND type = 'expense';
                UPDATE transactions SET subtype = 'transfer_from_savings' WHERE category IN ('Retiro de ahorro') AND type = 'income';
            ",
            kind: MigrationKind::Up,
        },
    ];

    let f11 = Shortcut::new(None::<Modifiers>, Code::F11);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:gastos.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::receipts::copy_to_receipts,
            commands::receipts::delete_receipt,
            commands::receipts::get_receipt_path,
            commands::receipts::read_receipt_as_data_url,
        ])
        .setup(move |app| {
            app.global_shortcut().on_shortcut(f11, move |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    if let Some(win) = app.get_webview_window("main") {
                        let is_fullscreen = win.is_fullscreen().unwrap_or(false);
                        let _ = win.set_fullscreen(!is_fullscreen);
                    }
                }
            })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
