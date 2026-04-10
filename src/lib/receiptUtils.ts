import { invoke } from '@tauri-apps/api/core';
import { open as shellOpen } from '@tauri-apps/plugin-shell';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function buildFilename(sourcePath: string, category: string, date: string): string {
  const ext = sourcePath.split('.').pop()?.toLowerCase() ?? 'bin';
  const [year, monthStr] = date.split('-');
  const monthName = MESES[(parseInt(monthStr, 10) - 1)] ?? monthStr;
  // Sanitizar categoría: quitar caracteres problemáticos para nombres de archivo
  const safeCategory = category.replace(/[/\\:*?"<>|]/g, '').trim().replace(/\s+/g, '_');
  return `${safeCategory}_${monthName}_${year}.${ext}`;
}

/** Copia el archivo al directorio de comprobantes con nombre {categoria}_{mes}_{año}.ext */
export async function copyReceiptFile(sourcePath: string, category: string, date: string): Promise<string> {
  const desiredFilename = buildFilename(sourcePath, category, date);
  return invoke<string>('copy_to_receipts', { source: sourcePath, desiredFilename });
}

/** Borra el archivo de comprobante via comando Rust. Silencioso si no existe. */
export async function deleteReceiptFile(filename: string): Promise<void> {
  await invoke<void>('delete_receipt', { filename });
}

/** Abre el comprobante con el visor del sistema. */
export async function openReceiptFile(filename: string): Promise<void> {
  const fullPath = await invoke<string>('get_receipt_path', { filename });
  // shell.open necesita el esquema file:// en Linux para rutas absolutas
  const uri = fullPath.startsWith('file://') ? fullPath : `file://${fullPath}`;
  await shellOpen(uri);
}
