import "./App.css";
import Layout from "./Layout";
import React, { useEffect, useState, createContext, useContext, Context } from "react";

// Type definitions
type SelectedFileType = {
  fileName?: string;
  colNames: Array<string>;
  data: Array<Record<string, unknown>>;
}

type SelectedColumn = {
  colName?: string;
  isNumeric: boolean;
  ascending: boolean;
};

type SelectedColumnContextType = {
  selectedColumn: SelectedColumn;
  setSelectedColumn: React.Dispatch<React.SetStateAction<SelectedColumn>>;
};


// Contexts for sharing state across components
const SelectedFileContext = createContext<SelectedFileType>({ colNames: [], data: [] });
const SelectedColumnContext = createContext<SelectedColumnContextType | undefined>(undefined);

// Context for managing file actions
const FileActionContext = createContext<{
  onFileUpload: (file: File) => Promise<void>;
  onViewFile: (fileName: string) => Promise<void>;
  onDeleteFile: (fileName: string) => Promise<void>;
}>({ onFileUpload: async () => {}, onViewFile: async () => {}, onDeleteFile: async () => {} });




/**
 * Custom hook to handle server-sent file events for uploaded and deleted files.
 *
 * @returns {object | null} - Returns file event data as JSON object, or null if no event has occurred.
 */
function useFileEvents() {
  const [fileEvent, setFileEvent] = useState(null);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("fileUploaded", (event) => setFileEvent(JSON.parse(event.data)));
    eventSource.addEventListener("fileDeleted", (event) => setFileEvent(JSON.parse(event.data)));

    // Cleanup on component unmount
    return () => {
      eventSource.close();
    };
  }, []);

  return fileEvent;
}


/**
 * Main application component responsible for managing file selection, upload, and rendering file overview.
 *
 * @returns {JSX.Element} - Returns the main layout of the application.
 */
function App(): JSX.Element {
  const [selectedFile, setSelectedFile] = useState<SelectedFileType>({ colNames: [], data: [] });
  const [selectedColumn, setSelectedColumn] = useState<SelectedColumn>({ isNumeric: false, ascending: true });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onFileUpload = async (file:File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/uploadFile", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed to upload file");
    } catch (error) {
      console.error("Error uploading file", error);
    }
  };

  const onViewFile = async (fileName: string): Promise<void> => {
    if (fileName == selectedFile.fileName) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/getFileData/${fileName}`);
      if (!response.ok) throw new Error("Failed to fetch file data");

      const fileJson = await response.json();
      if (fileJson.length == 0) throw new Error("Empty file");

      setSelectedColumn({ isNumeric: false, ascending: true });
      setSelectedFile({ fileName: fileName, colNames: Object.keys(fileJson[0]), data: fileJson });
    } catch (error) {
      console.error("Error getting file data", error);
    } finally {
      setIsLoading(false);
    }
  }

  const onDeleteFile = async (fileName: string): Promise<void> => {
    try {
      const response = await fetch(`/api/deleteFile/${fileName}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete file");

      if (selectedFile.fileName == fileName) setSelectedFile({ colNames: [], data: [] });
    } catch (error) {
      console.error("Error deleting file", error);
    }
  }

  return (
    <Layout>
      <SelectedFileContext.Provider value={selectedFile}>
        <FileActionContext.Provider value={{ onFileUpload, onViewFile, onDeleteFile }}>
          <FileInputCard />
          <FileOverviewCard />
          <SelectedColumnContext.Provider value={{ selectedColumn, setSelectedColumn }}>
            <DataTable isLoading={isLoading}/>
          </SelectedColumnContext.Provider>
        </FileActionContext.Provider>
      </SelectedFileContext.Provider>
    </Layout>
  )
}


/**
 * FileInputCard Component - Renders a form for selecting and uploading a CSV file.
 *
 * @returns {JSX.Element} - JSX structure for file input UI.
 */
function FileInputCard(): JSX.Element {
  const { onFileUpload } = useContext(FileActionContext);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files) return Promise.resolve();

    const file = event.target.files[0] as File;
    return onFileUpload(file);
  }

  return (
    <article>
      <header>
        <h2>Upload csv data</h2>
      </header>
      <form id="select-data-form">
        <label htmlFor="file-input" className="custom-file-upload">
        <i className="fa fa-file-csv"></i> Select csv file to explore
        </label>
        <input id="file-input" type="file" accept=".csv" onChange={handleFileUpload} aria-describedby="fileHelp"/>
        <small id="fileHelp"
          >Please upload a csv file, where the first row is the header. And
          the values are comma(,) seperated.</small>
      </form>
    </article>
  );
}


/**
 * FileOverviewCard Component - Displays an overview of uploaded files, with actions for viewing or deleting each file.
 *
 * @returns {JSX.Element} - JSX structure for file overview UI.
 */
function FileOverviewCard(): JSX.Element {
  const [storedFileList, setStoredFileList] = useState<Array<string>>([]);
  const { onViewFile, onDeleteFile } = useContext(FileActionContext);
  const fileEvent = useFileEvents();

  /**
   * Fetches the list of uploaded files from the server.
   *
   * @returns {Promise<void>} - Resolves when file list is successfully loaded.
   */
  const loadFileList = async (): Promise<void> => {
    try {
      const response = await fetch("/api/getFileList", { method: "GET" });
      if (!response.ok) throw new Error("Failed to fetch file list");

      const files = await response.json() as Array<string>;
      setStoredFileList(files);
    } catch (error) {
      console.error("Error getting file list", error);
    }
  };

  // Load file list on component mount
  useEffect(() => {
    loadFileList();
  }, []);

  // Update file list when file events occur
  useEffect(() => {
    if (fileEvent) loadFileList();
  }, [fileEvent]);
  // maybe add style to action
  return (
    <article className="file-info-card">
      <header className="file-info-card__header">
        <h2>Data infos</h2>
      </header>
      <table>
        <thead>
          <tr>
          <th>#</th>
            <th>File name</th>
            <th>Uploaded</th>
            <th>Action</th> 
          </tr>
        </thead>
        <tbody>
          {storedFileList.map((fileName, idx) => (
            <tr key={fileName}>
              <td>{idx + 1}</td>
              <td>{getLocalFileName(fileName)}</td>
              <td>{getTimeString(fileName)}</td>
              <td>
                <div className="file-info-card__table--entry__icon--div">
                  <i className="file-info-card__table--entry__icon 
                               file-info-card__table--entry__icon__eye
                               fa fa-eye"
                     onClick={(_event) => onViewFile(fileName)}
                     ></i>
                  <i className="file-info-card__table--entry__icon
                                fa
                                fa-trash"
                     onClick={(_event) => onDeleteFile(fileName)}
                     ></i>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}


/**
 * DataTable Component - Renders the main data table including headers and content.
 * Renders a loading icon when data is being fetched.
 *
 * @returns {JSX.Element} - Returns the data table layout.
 */
function DataTable(props: { isLoading: boolean }): JSX.Element {

  const figureContent = props.isLoading 
  ? (<div aria-busy="true" className="data-table__loading">Data is loading ...</div>)
  : (<table>
      <thead className="data-table__thead">
        <DataTableTheadRow />
      </thead>
      <tbody className="data-table__tbody">
        <DataTableTbodyRows />
      </tbody>
      </table>);

  return (
    <article className="data-table__wrapper">
      <header>
        <h2>Data table</h2>
      </header>
      <figure id="data-table__figure">
        {figureContent}
      </figure>
    </article>
  );
}


/**
 * DataTableTheadRow Component - Renders the header row with column names.
 * 
 *
 * @returns {JSX.Element} - Returns the header row for the data table.
 */
function DataTableTheadRow(): JSX.Element {
  const { colNames } = useContext(SelectedFileContext);

  return (
    <tr>
      {colNames.map((colName, idx) => (
        <DataTableTheadRowCell colName={colName} key={idx} />
      ))}
    </tr>
  )
}


/**
 * DataTableHeaderRowCell Component - Renders individual header cells for the columns.
 * Assigns the correct active classes to the column names based on the selected column state.
 * Also handles click events to update the selected column state.
 * 
 * @param {object} props - The properties for the component.
 * @param {string} props.colName - The name of the column for this header cell.
 * @returns {JSX.Element} - Returns a header cell element.
 */
function DataTableTheadRowCell(props: { colName: string}): JSX.Element {
  const { selectedColumn, setSelectedColumn } = useContext(SelectedColumnContext as Context<SelectedColumnContextType>);
  const data = useContext(SelectedFileContext).data;

  /**
   * Handler for column click events, updating the selected column state.
   *
   * @param {string} colName - The name of the column that was clicked.
   */
  const onColumnClick = (colName: string): void => {
    if (selectedColumn.colName == colName) {
      setSelectedColumn({
        ...selectedColumn,
        ascending: !selectedColumn.ascending,
      });
    } else {
      console.log("colName: ", colName);
      setSelectedColumn({
        colName: colName,
        isNumeric: columnIsNumeric(data, colName),
        ascending: true,
      });
    }
  };

  let sortClasses = "sortable";
  if (selectedColumn.colName == props.colName) {
    sortClasses += selectedColumn.ascending ? " active asc" : " active desc";
  }

  return (
    <th className={sortClasses} onClick={(_event) => onColumnClick(props.colName)}>{props.colName}</th>
  );
}


/**
 * DataTableContent Component - Renders the data rows of the table.
 * Responsible for sorting and formatting the data based on the selected column state.
 *
 * @returns {JSX.Element} - Returns the content rows of the data table.
 */
function DataTableTbodyRows(): JSX.Element {
  const { selectedColumn } = useContext(SelectedColumnContext as Context<SelectedColumnContextType>);
  const { data } = useContext(SelectedFileContext);

  // Sort data if a column is selected
  if (selectedColumn.colName !== undefined) {
    const cmp = getComparator(selectedColumn.colName, selectedColumn.isNumeric, selectedColumn.ascending);
    data.sort(cmp);
  }

  return (
    <>
      {data.map((row, idx) => (
        <DataTableTbodyRow row={row} key={idx} />
      ))}
    </>
  );
}


/**
 * DataTableTbodyRow Component - Renders a row of data in the table.
 *
 * @param {object} props - The properties for the component.
 * @param {Record<string, unknown>} props.row - The data row to render.
 * @returns {JSX.Element} - Returns a table row element.
*/

function DataTableTbodyRow(props: { row: Record<string, unknown> }): JSX.Element {
  return (
    <tr>
      {Object.values(props.row).map((value, idx) => (
        <td key={idx}>{value as string}</td>
      ))}
    </tr>
  );
}



/**
 * Utility function to format timestamp from filename.
 *
 * @param {string} fileName - The internal file name containing a timestamp.
 * @returns {string} - A formatted date string.
 */
function getTimeString(fileName: string): string {
  const timestamp = Number(fileName.split("-")[0] as string);
  return new Date(timestamp).toLocaleString();
}

/**
 * Utility function to determine if a column contains numeric values.
 *
 * @param {Array<Record<string, unknown>>} data - The data to check.
 * @param {string} colName - The name of the column to check.
 * @returns {boolean} - Returns true if the column is numeric, false otherwise.
 */

/**
 * Utility function to format original filename from filename.
 *
 * @param {string} fileName - The internal file name
 * @returns {string} - The original file name.
 */
function getLocalFileName(fileName: string): string {
  return fileName.split("-").slice(1).join();
}


/**
 * Utility function to determine if a column contains numeric values.
 *
 * @param {string} colName - The name of the column to check.
 * @returns {boolean} - Returns true if the column is numeric, false otherwise.
 */

function columnIsNumeric(data: Array<Record<string, unknown>>, colName:string): boolean {
  return !isNaN(Number(data[0]?.[colName]));
}


/**
 * Utility function to get a comparator function for sorting.
 *
 * @param {string} colName - The name of the column to compare.
 * @param {boolean} isNumeric - Whether the column contains numeric data.
 * @param {boolean} ascending - Whether to sort in ascending order.
 * @returns {(a: Record<string, unknown>, b: Record<string, unknown>) => number} - The comparator function.
 */
function getComparator(colName: string, isNumeric: boolean, ascending: boolean): (a: Record<string, unknown>, b: Record<string, unknown>) => number {
  const cmp_type: (a: Record<string, unknown>, b: Record<string, unknown>) => number = isNumeric
    ? (a, b) => Number(a[colName]) - Number(b[colName])
    : (a, b) => String(a[colName]).localeCompare(String(b[colName]));
  
  return ascending
    ? (a, b) => cmp_type(a, b)
    : (a, b) => cmp_type(b, a);
}

export default App;