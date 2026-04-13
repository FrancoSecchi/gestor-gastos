use base64::{engine::general_purpose, Engine as _};
use std::path::Path;
use tauri::Manager;

fn validate_receipt_filename(filename: &str) -> Result<&str, String> {
    if filename.is_empty() {
        return Err("Nombre de archivo inválido".into());
    }

    let path = Path::new(filename);
    let basename = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Nombre de archivo inválido".to_string())?;

    if basename != filename || basename == "." || basename == ".." {
        return Err("Nombre de archivo inválido".into());
    }

    Ok(basename)
}

/// Copia el archivo `source` al directorio de comprobantes con el nombre `desired_filename`.
/// Si ya existe un archivo con ese nombre, agrega un sufijo numérico (_2, _3, …).
#[tauri::command]
pub async fn copy_to_receipts(
    app: tauri::AppHandle,
    source: String,
    desired_filename: String,
) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let receipts_dir = data_dir.join("receipts");
    let desired_filename = validate_receipt_filename(&desired_filename)?.to_string();

    std::fs::create_dir_all(&receipts_dir)
        .map_err(|e| format!("No se pudo crear el directorio: {}", e))?;

    // Separar stem y extensión del nombre deseado
    let path = Path::new(&desired_filename);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("comprobante");
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("bin");

    // Encontrar un nombre disponible
    let mut filename = desired_filename.clone();
    let mut counter = 2u32;
    while receipts_dir.join(&filename).exists() {
        filename = format!("{}_{}.{}", stem, counter, ext);
        counter += 1;
    }

    let dest = receipts_dir.join(&filename);
    std::fs::copy(&source, &dest)
        .map_err(|e| format!("Error al copiar el archivo: {}", e))?;

    Ok(filename)
}

#[tauri::command]
pub async fn delete_receipt(app: tauri::AppHandle, filename: String) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let filename = validate_receipt_filename(&filename)?;
    let file_path = data_dir.join("receipts").join(filename);

    if file_path.exists() {
        std::fs::remove_file(&file_path)
            .map_err(|e| format!("Error al eliminar el archivo: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_receipt_path(app: tauri::AppHandle, filename: String) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let filename = validate_receipt_filename(&filename)?;
    let file_path = data_dir.join("receipts").join(filename);
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn read_receipt_as_data_url(
    app: tauri::AppHandle,
    filename: String,
) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let filename = validate_receipt_filename(&filename)?;
    let file_path = data_dir.join("receipts").join(filename);

    let bytes =
        std::fs::read(&file_path).map_err(|e| format!("No se pudo leer el archivo: {}", e))?;

    let ext = Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin")
        .to_lowercase();

    let mime = match ext.as_str() {
        "pdf" => "application/pdf",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        _ => "application/octet-stream",
    };

    let b64 = general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}
