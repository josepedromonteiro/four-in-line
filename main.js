const { app, BrowserWindow } = require('electron')
const url = require('url');
const path = require('path');
var isWin = process.platform === "win32";

function createWindow() {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    titleBarStyle: isWin ? 'hidden' :'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // nodeIntegration: true
    }
  })

  win.maximize()

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `dist/four-in-line/index.html`),
      protocol: 'file:',
      slashes: true
    })
  );
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
