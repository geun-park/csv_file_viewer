import express from "express";
import ViteExpress from "vite-express";
import multer from "multer";
import fs from "fs";
import { csv2json } from "json-2-csv";

// creates the expres app do not change
const app = express();

/* ------------- Added Code ------------- */

// define where to store the uploaded files
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "src/server/uploads/");
  },

  filename: function(_req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({storage: storage});



// route to handle file upload
app.post("/api/upload", upload.single("file"), function (req, res) {
  if (!req.file) {
    res.status(400).send("No file uploaded");
    return; 
  }
  console.log(req.file);
  res.send("File uploaded successfully");
})


// route to save the clicked column per file

// route to get stored names of all files
app.get("/api/getFileNames", function (_reg, res) {
  fs.readdir("src/server/uploads", function (err, files) {
    if (err) {
      res.status(500).send("Error reading files");
      return;
    }
    console.log(files);
    res.json(files);
  });

})

//route to get data from a file
app.get("/api/getFileData/:fileName", function (req, res) {
  console.log("test");
  console.log("Getting file data for: ", req.params.fileName);
  const fileName= req.params.fileName;
  const filePath = "src/server/uploads/"+fileName;
  fs.access(filePath, fs.constants.F_OK, function (err) {

  if (err) {
    res.status(404).send("File not found");
    return;
  }

    // read the file, send its contents
    fs.readFile(filePath, "utf8", async function (err, data) {
      if (err) {
        console.error("Error reading file", err);
        res.status(500).send("Error reading file");
        return;
      }
      res.json(await csv2json(data));
    });
  });
})

/* ------------- Added Code ------------- */

// Do not change below this line
ViteExpress.listen(app, 5173, () =>
    console.log("Server is listening on http://localhost:5173"),
);
