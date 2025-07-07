# Implementing Live Deployment Logs and Pre-Deploy UX in Sigyl

This guide describes how to improve the deployment experience in Sigyl by:
- Streaming live deployment/build logs to the frontend (from backend and Google Cloud Run)
- Redirecting users to a pre-deploy MCPPackagePage where they can see package info and live logs as deployment progresses

---

## 1. **Backend: Streaming Deployment Logs**

### **A. Choose a Log Streaming Method**
- **WebSocket (Recommended):**
  - Expose a WebSocket endpoint (e.g., `/ws/deploy-logs/:deploymentId`)
  - As the backend runs the deployment, stream log lines to the WebSocket
  - Buffer logs in memory or DB so users can reconnect and see recent logs
- **Polling (Simpler):**
  - Expose a REST endpoint (e.g., `/api/deployments/:id/logs`)
  - Store logs in memory, DB, or file as deployment runs
  - Frontend polls for new logs every few seconds

### **B. Backend Steps**
1. **Modify deployment logic** to stream or store logs as the build/deploy process runs
2. **Expose log endpoint** (WebSocket or REST) for the frontend to consume
3. **(Optional) Integrate Google Cloud Run logs**
   - After deployment, fetch logs from Google Cloud Logging API and append to the log stream

---

## 2. **Frontend: Redirect and Live Log Viewer**

### **A. Redirect to MCPPackagePage on Deploy**
- In `DeployWizardWithGitHubApp.tsx`, after starting deployment, immediately redirect to `/mcp/:packageId?new=true&deploying=true`
- Pass any available package info (name, slug, etc.) to the MCPPackagePage (via state, query params, or fetch from backend)

### **B. MCPPackagePage: Pre-Deploy State**
- Detect `?deploying=true` in the URL
- Show a "Deployment in progress" banner/section
- Display available package info (name, slug, etc.) even if deployment is not complete
- Show a log viewer (tab or section) that connects to the backend log endpoint
- As logs arrive, append them to the viewer (auto-scroll to bottom)
- When deployment completes, update the page to show the full package info

### **C. Log Viewer UI**
- Use a scrollable `<pre>` or terminal-like component
- Optionally, allow users to refresh or reconnect if connection is lost

---

## 3. **Handling Navigation and Deployment Lifecycle**
- Deployment is managed by the backend and is not tied to the user's session or page
- Users can freely navigate away; deployment will continue
- If the user returns to the MCPPackagePage, they should see the current deployment status and logs

---

## 4. **Implementation Steps (Summary Table)**

| Step | Area      | Description |
|------|-----------|-------------|
| 1    | Backend   | Add log streaming/storage to deployment process |
| 2    | Backend   | Expose WebSocket or REST endpoint for logs |
| 3    | Frontend  | Redirect to MCPPackagePage on deploy |
| 4    | Frontend  | Show pre-deploy state and log viewer in MCPPackagePage |
| 5    | Frontend  | Connect log viewer to backend endpoint |
| 6    | Backend   | (Optional) Integrate Google Cloud Run logs after deploy |

---

## 5. **Best Practices**
- Buffer logs on the backend so users can reconnect and see recent output
- Show clear deployment progress and error states in the UI
- Allow users to view/edit package info as soon as possible, even before deployment completes

---

## 6. **References & Further Reading**
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Google Cloud Logging API](https://cloud.google.com/logging/docs/reference/v2/rest/v2/entries/list)
- [React log viewer example (StackOverflow)](https://stackoverflow.com/questions/43333636/how-to-display-live-logs-in-react)

---

**This guide should help you implement a modern, user-friendly deployment experience in Sigyl.** 