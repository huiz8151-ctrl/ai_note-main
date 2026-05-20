const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, session } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { loadLocalEnv } = require("../lib/load-local-env");

loadLocalEnv({ root: path.join(__dirname, "..") });

const {
  generateSummary,
  testModelConnection,
  transcribeChunk
} = require("../lib/ai-service");
const {
  deleteChatbotSession,
  getChatbotHealth,
  sendChatbotMessage,
  shutdownChatbotService
} = require("../lib/chatbot-service-manager");
const { createLiveTranscriptionManager } = require("../lib/live-transcription-manager");

const ROOT = path.join(__dirname, "..");
const liveTranscriptionManager = createLiveTranscriptionManager({
  defaultModel: "medium",
  root: ROOT
});

function isStartRecordingShortcut(input) {
  const key = String(input?.key || "").trim().toLowerCase();
  const code = String(input?.code || "").trim();

  return Boolean(
    input?.alt &&
      !input?.control &&
      !input?.meta &&
      !input?.shift &&
      (code === "Space" || key === "space" || key === " ")
  );
}

function installRecordingShortcuts(mainWindow) {
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || !isStartRecordingShortcut(input)) {
      return;
    }

    event.preventDefault();
    mainWindow.webContents.send("ai-note:shortcut-triggered", {
      accelerator: "Alt+Space",
      action: "start-recording"
    });
  });
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1280,
    minHeight: 760,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    backgroundColor: "#edf1f6",
    title: "AI Note",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  installRecordingShortcuts(mainWindow);
  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
  return mainWindow;
}

function installMediaPermissions() {
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media" || permission === "display-capture";
  });

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      if (permission === "media" || permission === "display-capture") {
        callback(true);
        return;
      }

      callback(false);
    }
  );

  if (typeof session.defaultSession.setDisplayMediaRequestHandler === "function") {
    session.defaultSession.setDisplayMediaRequestHandler(
      async (_request, callback) => {
        try {
          const sources = await desktopCapturer.getSources({
            types: ["screen", "window"],
            thumbnailSize: {
              width: 0,
              height: 0
            }
          });
          const preferredSource =
            sources.find((source) => source.display_id) ||
            sources.find((source) => source.id.startsWith("screen:")) ||
            sources[0];

          callback(
            preferredSource
              ? {
                  video: preferredSource,
                  audio: "loopback"
                }
              : {}
          );
        } catch {
          callback({});
        }
      },
      { useSystemPicker: false }
    );
  }
}

ipcMain.handle("ai-note:transcribe-chunk", async (_event, payload) => {
  return transcribeChunk(payload);
});

ipcMain.handle("ai-note:generate-summary", async (_event, payload) => {
  return generateSummary(payload);
});

ipcMain.handle("ai-note:test-model-connection", async (_event, payload) => {
  return testModelConnection(payload);
});

ipcMain.handle("ai-note:start-live-transcription", async (_event, payload) => {
  return liveTranscriptionManager.startSession(payload);
});

ipcMain.handle("ai-note:transcribe-live-chunk", async (_event, payload) => {
  return liveTranscriptionManager.transcribeChunk(payload);
});

ipcMain.handle("ai-note:stop-live-transcription", async (_event, payload) => {
  return liveTranscriptionManager.stopSession(payload?.sessionId);
});

ipcMain.handle("ai-note:chatbot-health", async () => {
  return getChatbotHealth();
});

ipcMain.handle("ai-note:chatbot-send-message", async (_event, payload) => {
  return sendChatbotMessage(payload || {});
});

ipcMain.handle("ai-note:chatbot-delete-session", async (_event, payload) => {
  return deleteChatbotSession(payload?.sessionId);
});

ipcMain.handle("ai-note:export-markdown", async (_event, payload) => {
  const defaultFileName =
    payload.defaultFileName ||
    `ai-note-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.md`;

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "导出记录",
    defaultPath: path.join(app.getPath("documents"), defaultFileName),
    filters: [{ name: "Markdown", extensions: ["md"] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  await fs.writeFile(filePath, payload.content, "utf8");
  return { canceled: false, filePath };
});

app.whenReady().then(() => {
  installMediaPermissions();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void liveTranscriptionManager.shutdown();
  void shutdownChatbotService();
});
