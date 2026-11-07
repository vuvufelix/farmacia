import { app, BrowserWindow, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { startServer } from '../backend/server.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
const PORT = 3333

async function createWindow() {
  try {
    // 1. Iniciar o servidor Express localmente
    await startServer(PORT)

    // 2. Criar a janela principal do Electron
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 720,
      title: 'Nenova Tech - Gestão de Farmácia (Offline)',
      icon: path.join(__dirname, '../../assets/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    // Ocultar a barra de menu padrão para aspeto profissional
    mainWindow.setMenu(null)

    // Carregar o painel localmente
    const appUrl = process.env.FRONTEND_URL || `http://localhost:${PORT}`
    await mainWindow.loadURL(appUrl)

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  } catch (error: any) {
    dialog.showErrorBox(
      'Erro de Inicialização',
      `Não foi possível iniciar o servidor local da Nenova Tech.\n\nDetalhes: ${error.message}`
    )
    app.quit()
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})