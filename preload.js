var isWin = process.platform === "win32";


window.addEventListener('DOMContentLoaded', () => {
  if (isWin) {
    const customTitlebar = require('custom-electron-titlebar');

    let bar = new customTitlebar.Titlebar({
      backgroundColor: customTitlebar.Color.fromHex('#3f51b5')
    });

    bar.updateTitle('Connect 4');
    bar.updateMenu(null);
  }
});
