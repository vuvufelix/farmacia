import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 🚀 IMPORTAR A FUNÇÃO DE ARRANQUE DO BACKEND
import { startServer } from '../backend/server.js';

// Recriar __dirname e __filename para ambientes ESM
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

  // 🛠️ Verificação inteligente: Produção vs Desenvolvimento
  if (app.isPackaged) {
    // Em produção (instalado no .deb), o servidor Express serve os estáticos na porta 3333
    // Logo, podemos carregar diretamente via HTTP local para que as rotas da API funcionem perfeitamente!
    mainWindow.loadURL('http://localhost:3333');
  } else {
    // Em desenvolvimento, aponta para o servidor local do Vite/Backend
    mainWindow.loadURL('http://localhost:3333');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 🚀 INICIA O SERVIDOR EXPRESS OBRIGATORIAMENTE ANTES DE CRIAR A JANELA
  try {
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