const { app, BrowserWindow } = require('electron')
const url = require('url');
const path = require('path');
var isWin = process.platform === "win32";

function createWindow() {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    titleBarStyle: isWin ? 'hidden' :'hiddenInset',
    webPreferences: {
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

  if(isWin){
    const customTitlebar = require('custom-electron-titlebar');

    new customTitlebar.Titlebar({
      backgroundColor: customTitlebar.Color.fromHex('#3f51b5')
    });
  }
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
