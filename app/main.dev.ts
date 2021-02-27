/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable promise/catch-or-return */
/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import "core-js/stable";
import "regenerator-runtime/runtime";
import path from "path";
import os from "os";
import { app, BrowserWindow, session } from "electron";
import log from "electron-log";
// import installExtension, {
//   REACT_DEVELOPER_TOOLS
// } from "electron-devtools-installer";
import MenuBuilder from "./menu";

enum NodeJsPlatform {
  Aix = "aix",
  Android = "android",
  Darwin = "darwin",
  FreeBsd = "freebsd",
  Linux = "linux",
  OpenBsd = "openbsd",
  Sunos = "sunos",
  Windows = "win32",
  Cygwin = "cygwin",
  NetBsd = "netbsd"
}

export default class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    // autoUpdater.logger = log;
    // autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === "development" ||
  process.env.DEBUG_PROD === "true"
) {
  require("electron-debug")();
}

const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS", "REDUX_DEVTOOLS"];

  return Promise.all(
    extensions.map((name) => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.DEBUG_PROD === "true"
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1920,
    height: 1080,
    webPreferences:
      (process.env.NODE_ENV === "development" ||
        process.env.E2E_BUILD === "true") &&
      process.env.ERB_SECURE !== "true"
        ? {
            nodeIntegration: true
          }
        : {
            preload: path.join(__dirname, "dist/renderer.prod.js")
          }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on("did-finish-load", () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // This dialog unfocuses the editor which triggers an autosave before shutting down.
  // TODO: Might want to find another solution for this later.
  mainWindow.on("close", (e) => {
    if (!mainWindow) return;
    const choice = require("electron").dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["Yes", "No"],
      title: "Confirm",
      message: "Are you sure you want to quit?"
    });
    if (choice === 1) {
      e.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on("window-all-closed", () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== "darwin") {
    app.quit();
  }
});

if (process.env.E2E_BUILD === "true") {
  // eslint-disable-next-line promise/catch-or-return
  app.whenReady().then(createWindow);
} else {
  app.on("ready", createWindow);
}

app.on("activate", () => {
  // On macOS it's common to re-create aya window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

// TODO: This is broken right now, monitor updates to the project and update electron-devtools-installer
app.whenReady().then(() => {
  // installExtension(REACT_DEVELOPER_TOOLS, true)
  //   .then((name) => console.log(`Added Extension:  ${name}`))
  //   .catch((err) => console.log("An error occurred: ", err));
  // Refer to https://www.electronjs.org/docs/tutorial/devtools-extension#how-to-load-a-devtools-extension
  // for more information on platform specifics
  const reactDevToolsId = "fmkadmapgofadopljbjfkapdkoienihi";
  const reactDevToolsVersion = "4.10.1_0";
  session.defaultSession.loadExtension(
    os.platform() === NodeJsPlatform.Windows
      ? path.join(
          os.homedir(),
          `AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\${reactDevToolsId}\\${reactDevToolsVersion}`
        )
      : path.join(
          os.homedir(),
          `/.config/google-chrome/Default/Extensions/${reactDevToolsId}/${reactDevToolsVersion}`
        )
  );
});
