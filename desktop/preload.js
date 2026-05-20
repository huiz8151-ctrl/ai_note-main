const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiNoteApi", {
  chatbotDeleteSession: (payload) =>
    ipcRenderer.invoke("ai-note:chatbot-delete-session", payload),
  chatbotHealth: () => ipcRenderer.invoke("ai-note:chatbot-health"),
  chatbotSendMessage: (payload) =>
    ipcRenderer.invoke("ai-note:chatbot-send-message", payload),
  exportMarkdown: (payload) => ipcRenderer.invoke("ai-note:export-markdown", payload),
  generateSummary: (payload) => ipcRenderer.invoke("ai-note:generate-summary", payload),
  onShortcutTriggered: (callback) => {
    if (typeof callback !== "function") {
      return;
    }

    ipcRenderer.on("ai-note:shortcut-triggered", (_event, payload) => {
      callback(payload);
    });
  },
  startLiveTranscription: (payload) =>
    ipcRenderer.invoke("ai-note:start-live-transcription", payload),
  stopLiveTranscription: (payload) =>
    ipcRenderer.invoke("ai-note:stop-live-transcription", payload),
  testModelConnection: (payload) =>
    ipcRenderer.invoke("ai-note:test-model-connection", payload),
  transcribeLiveChunk: (payload) =>
    ipcRenderer.invoke("ai-note:transcribe-live-chunk", payload),
  transcribeChunk: (payload) => ipcRenderer.invoke("ai-note:transcribe-chunk", payload)
});
