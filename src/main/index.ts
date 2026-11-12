import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: 'MedLote OS - Gestão Farmacêutica'
  });

  mainWindow.loadURL('http://localhost:3333');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 🛡️ PASSO CRUCIAL: Define o caminho exato do userData para o SQLite antes de carregar o backend
  process.env.DB_USER_DATA_PATH = app.getPath('userData');
  console.log('📂 userData do Electron configurado:', process.env.DB_USER_DATA_PATH);

  // Importa e inicia o servidor Express dinamicamente após o ambiente estar pronto
  try {
    const { startServer } = await import('../backend/server.js');
    await startServer(3333);
  } catch (error) {
    console.error("❌ Falha crítica ao iniciar o servidor backend:", error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});