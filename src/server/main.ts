import express from "express";
import ViteExpress from "vite-express";
import multer from "multer";
import fs from "fs";
import { csv2json } from "json-2-csv";
import EventEmitter from "events";

// Initialize the Express app
const app = express();


/* ------------- Event System Setup ------------- */

/**
 * Custom Event Emitter for file events.
 * Emits "fileUploaded" and "fileDeleted" events to notify listeners of file changes.
 */
class FileEventEmitter extends EventEmitter {}
const fileEventEmitter = new FileEventEmitter();


/**
 * Sets up and sends Server-Sent Events (SSE) to the client for file events.
 * @param {express.Request} req - The request object.
 * @param {express.Response} res - The response object for streaming events.
 */
function setupSSE(req: express.Request, res: express.Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  /**
   * Sends an event to the SSE client.
   * @param {string} eventType - Type of event (e.g., "fileUploaded").
   * @param {string} data - Event payload data.
   */
  const sendEvent = (eventType: string, data: string) => {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onFileUploaded = (fileName: string) => sendEvent("fileUploaded", fileName);
  const onFileDeleted = (fileName: string) => sendEvent("fileDeleted", fileName);

  fileEventEmitter.on("fileUploaded", onFileUploaded);
  fileEventEmitter.on("fileDeleted", onFileDeleted);

  // Handle client disconnect
  req.on("close", () => {
    fileEventEmitter.off("fileUploaded", onFileUploaded);
    fileEventEmitter.off("fileDeleted", onFileDeleted);
    res.end();
  });
}

// Endpoint for receiving file event updates via Server-Sent Events (SSE)
app.get("/api/events", setupSSE);


/* ------------- File Storage Setup ------------- */

// Configure Multer to store files in a specific directory with unique timestamps
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "src/server/uploads/"),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });


/* ------------- Route Handlers ------------- */

/**
 * Handles file uploads by saving them to the server and emitting an upload event.
 * @param {express.Request} req - The request object with the file data.
 * @param {express.Response} res - The response object.
 */
function handleFileUpload(req: express.Request, res: express.Response) {
  if (!req.file) {
    res.status(400).send("No file uploaded");
    return
  }
  console.log("File uploaded:", req.file);
  fileEventEmitter.emit("fileUploaded", req.file.originalname);
  res.send("File uploaded successfully");
}

// Route to handle file upload
app.post("/api/uploadFile", upload.single("file"), handleFileUpload);


/**
 * Handles file deletion from the server and emits a deletion event.
 * @param {express.Request} req - The request object with file name parameter.
 * @param {express.Response} res - The response object.
 */
function handleFileDelete(req: express.Request, res: express.Response) {
  const fileName = req.params["fileName"];
  const filePath = `src/server/uploads/${fileName}`;

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file", err);
      res.status(500).send("Error deleting file");
      return;
    }
    fileEventEmitter.emit("fileDeleted", fileName);
    res.send("File deleted successfully");
  });
}

// Route to handle file deletion
app.delete("/api/deleteFile/:fileName", handleFileDelete);


/**
 * Retrieves the list of uploaded files in the server's storage directory.
 * @param {express.Request} _req - The request object.
 * @param {express.Response} res - The response object.
 */
function handleGetFileList(_req: express.Request, res: express.Response) {
  fs.readdir("src/server/uploads", (err, files) => {
    if (err) {
      res.status(500).send("Error reading files");
      return;
    }
    console.log(files);
    res.json(files);
  });
}

// Route to get stored names of all files
app.get("/api/getFileList", handleGetFileList);


/**
 * Retrieves data from a specified file, converting it from CSV to JSON format.
 * @param {express.Request} req - The request object with file name parameter.
 * @param {express.Response} res - The response object.
 */
async function handleGetFileData(req: express.Request, res: express.Response) {
  const fileName = req.params["fileName"];
  const filePath = `src/server/uploads/${fileName}`;

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).send("File not found");
      return;
    }

    fs.readFile(filePath, "utf-8", async (err, data) => {
      if (err) {
        res.status(500).send("Error reading file data");
        return;
      }

      const jsonData = await csv2json(data);
      res.json(jsonData);
    });
  });
}

// Route to retrieve data from a specific file
app.get("/api/getFileData/:fileName", handleGetFileData);



/* ------------- Server Setup ------------- */

// Start the server with ViteExpress
ViteExpress.listen(app, 5173, () =>
  console.log("Server is listening on http://localhost:5173"),
);