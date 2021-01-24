const { app, BrowserWindow } = require('electron')
const url = require('url');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
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