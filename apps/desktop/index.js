import { app, BrowserWindow, session } from "electron";
import path from "path";

const isDev = !app.isPackaged;

let mainWindow;

function installLocalApiBridge() {
  const filter = { urls: ["http://localhost:8000/*", "http://127.0.0.1:8000/*"] };
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = { ...details.requestHeaders, Origin: "http://localhost:5173" };
    callback({ requestHeaders: headers });
  });
  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    for (const key of Object.keys(responseHeaders)) {
      if (key.toLowerCase() === "access-control-allow-origin") delete responseHeaders[key];
    }
    responseHeaders["Access-Control-Allow-Origin"] = ["*"];
    responseHeaders["Access-Control-Allow-Headers"] = ["Authorization, Content-Type"];
    callback({ responseHeaders });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, "web/dist/index.html");

    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  installLocalApiBridge();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
