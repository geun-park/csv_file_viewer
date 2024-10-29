import "./App.css";
import Layout from "./Layout";
import React, { cloneElement, useEffect, useState }  from "react";
// import { csv2json } from "json-2-csv";

// Main application component
/**
 * App Component - The primary application container that renders the main layout and initiates the file input functionality.
 *
 * @returns {JSX.Element} - Returns the JSX structure for the application layout.
 */
interface SelectedFile {
  colNames: string[];
  data: Array<Record<string, unknown>>;
}

interface SelectedColumn {
  colName: string | undefined;
  isNumeric: boolean;
  ascending: boolean;
}

const SelectedFileContext = React.createContext<SelectedFile>({ colNames: [], data: [] });
const SelectedColumnContext = React.createContext<SelectedColumn>({ colName: undefined, isNumeric: false, ascending: true })


function App(): JSX.Element {
  const [storedFiles, setStoredFiles] = useState<Array<string>>([]);
  const [selectedFile, setSelectedFile] = useState<SelectedFile>({ colNames: [], data: [] });
  // const [selectedColumn, setSelectedColumn] = 

  const loadStoredFiles = async () => {
    // update the list of stored files
    try {
      const response = await fetch("/api/getFileNames", {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error("Failed to get file names");
      }

      const currStoredFiles = await response.json() as Array<string>;

      setStoredFiles(currStoredFiles);


    } catch (error) {
      console.error("Error getting file names", error);
    }
  }

  const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files) return;

    //initialize the form data
    const formData = new FormData();
    formData.append("file", event.target.files[0] as File);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      
      await loadStoredFiles();


      // todo: further process
    } catch (error) {
      console.error("Error uploading file", error);
    }
  }
  
  // when one of the uploaded files is selected, update the state of the selected file
  const onFileChange = async (fileName: string): Promise<void> => {
    try {
      const response = await fetch("/api/getFileData/"+fileName);
      if (!response.ok) {
        throw new Error("Failed to get file data");
      }

      const fileJson = await response.json();
      

      if (fileJson.length === 0) {
        throw new Error("Empty file");
      }

      setSelectedFile({
        colNames: Object.keys(fileJson[0] as Record<string, unknown>),
        data: fileJson
      });


    } catch (error) {
      console.error("Error getting file data", error);
    }
  }


  // load the stored files on initial render
  useEffect(() => {
    onFileChange("1730219014839-KANTON_SMALL.csv");
    loadStoredFiles();
  }, []);

  return (
    <Layout>
      <SelectedFileContext.Provider value={selectedFile}>
      <FileInputCard onFileUpload={onFileUpload} />

      <FileInfoCard storedFiles={storedFiles}/>

      <DataTable />
      </SelectedFileContext.Provider>
    </Layout>
  );
}



/**
 * FileInputCard Component - A card-style component for selecting and uploading a CSV file.
 *
 * @returns {JSX.Element} - JSX structure for the file input card UI, allowing users to upload CSV data.
 */
function FileInputCard({ onFileUpload }: { onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void> }): JSX.Element {
  return (
    <article>
    <header>
      <h2>Select csv data</h2>
    </header>
    <form 
      id="select-data-form"
      // encType="multipart/form-data"
      >
    <label htmlFor="file-input" className="custom-file-upload">
        <i className="fa fa-file-csv"></i> Select csv file to explore
      </label>
      <input
        id="file-input"
        type="file"
        aria-describedby="fileHelp"
        accept="text/csv"
        // name="uploaded_file"
        onChange={onFileUpload}
        />
        <small id="fileHelp"
          >Please upload a csv file, where the first row is the header. And
          the values are comma(,) seperated.</small>
    </form>
  </article>
  );
}



function FileInfoCard(props: { storedFiles: Array<string> }) : JSX.Element {
  let count = 1;

  return (
    <article className="file-info-card">
      <header className="file-info-card__header">
        <h2>Data infos</h2>
      </header>
      <table>
        <thead className="file-info-card__table__header">
          <tr>
            <th>#</th>
            <th>File name</th>
            <th>Uploaded</th>
            <th style={{ textAlign: "center"}}>Action</th>
          </tr>
        </thead>
        <tbody>
          {props.storedFiles.map((fileName : string) => {
            return (
              <tr key={fileName}>
                <td style={{ padding: "var(--spacing)"}}>{count++}</td>
                <td>{getFileName(fileName)}</td>
                <td>{getTimeString(fileName)}</td>
                <td style={{ textAlign: "center"}}>
                 <i className="fa fa-eye" style={{ textAlign: "center", padding: "0 var(--spacing)"}}></i>
                 <i className="fa fa-trash" style={{ textAlign: "center"}}></i>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}






function DataTable(): JSX.Element {
  const selectedFile = React.useContext(SelectedFileContext);
  const [selectedColumn, setSelectedColumn] = useState<SelectedColumn>({ colName: undefined, isNumeric: false, ascending: true });


  return (
    <SelectedColumnContext.Provider value={selectedColumn}>
      <article style={{ width: "100%" }}>
        <header>
          <h2>Data table</h2>
        </header>
        <figure id="table-content">
          <table >
            <thead id="table-content__headings">
              <DataTableHeaderRow colNames={selectedFile.colNames}/>
            </thead>
            <tbody id="table-content__data">
              <DataTableContent data={selectedFile.data}/>
            </tbody>
          </table>
        </figure>
      </article>
    </SelectedColumnContext.Provider>
  );
}


function DataTableHeaderRow(props: { colNames: string[]}): JSX.Element {

  return (
    <tr>
      {props.colNames.map((colName) => {
        return <HeaderRowCell colName={colName}/>
      })}
    </tr>
  )
}

function HeaderRowCell(props: { colName: string }): JSX.Element {
  return (
    <th
      className="sortable">{props.colName}</th>
  )
}

function DataTableContent(props: { data: Array<Record<string, unknown>> }): JSX.Element {
  return (
    <>
      {props.data.map((row: Record<string, unknown>) => {
        return <DataTableRow key={JSON.stringify(row)} row={row}/>
      })}
    </>
  );
}

function DataTableRow(props: { row: Record<string, unknown> }): JSX.Element {
  return (
    <tr>
      {Object.values(props.row).map((value) => {
        return <DataTableCell value={value}/>
      })}
    </tr>
  )
}

function DataTableCell(props: { value: unknown }): JSX.Element {
  return (
    <td>{props.value as string}</td>
  )
}


// takes internal file name and returns the timestamp as a string
function getTimeString(fileName: string): string {
  const timestamp = Number(fileName.split("-")[0] as string);
  return new Date(timestamp).toLocaleString();
}

// takes internal file name and returns the file name
function getFileName(fileName: string): string {
  return fileName.split("-").slice(1).join();
}

function columnIsNumeric(data: Array<Record<string, unknown>>, colName: string): boolean {
  return data[0]?.[colName] instanceof Number;
}

function getComparator(colName: string, isNumeric: boolean, ascending: boolean): (a: Record<string, unknown>, b: Record<string, unknown>) => number {
  let cmp_type:  (a: Record<string, unknown>, b: Record<string, unknown>) => number;
  if (isNumeric) {
    cmp_type = function (a: Record<string, unknown>, b: Record<string, unknown>): number {
      return Number(a[colName]) - Number(b[colName]);
    }
  } else {
    cmp_type = function (a: Record<string, unknown>, b: Record<string, unknown>): number {
      return String(a[colName]).localeCompare(String(b[colName]));
    }
  }

  let cmp_ordering: (a: Record<string, unknown>, b: Record<string, unknown>) => number;

  if (ascending) {
    cmp_ordering = cmp_type;
  } else {
    cmp_ordering = function (a: Record<string, unknown>, b: Record<string, unknown>): number {
      return cmp_type(b, a);
    }
  }

  return cmp_ordering;
}




export default App;
