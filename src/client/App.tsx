import "./App.css";
import Layout from "./Layout";
import { json2csv } from "json-2-csv";


// Main application component
/**
 * App Component - The primary application container that renders the main layout and initiates the file input functionality.
 *
 * @returns {JSX.Element} - Returns the JSX structure for the application layout.
 */
function App(): JSX.Element {
  return (
    <Layout>
      <FileInputCard />

      <FileInfoCard fileName="testName" fileType="testType" fileSize={-1} fileRows={-1} />

      <DataTableWrapper tableColumnHeadings={<></>} tableRows={<></>} />
    </Layout>
  );
}



/**
 * FileInputCard Component - A card-style component for selecting and uploading a CSV file.
 *
 * @returns {JSX.Element} - JSX structure for the file input card UI, allowing users to upload CSV data.
 */
function FileInputCard(): JSX.Element {



  return (
    <article>
    <header>
      <h2>Select csv data</h2>
    </header>
    <form id="select-data-form" action="/csvfiles" method="post" encType="multipart/form-data">
    <label htmlFor="file-input" className="custom-file-upload">
        <i className="fa fa-file-csv"></i> Select csv file to explore
      </label>
      <input
        id="file-input"
        type="file"
        aria-describedby="fileHelp"
        accept="text/csv"
        name="uploaded_file"
        />
        <small id="fileHelp"
          >Please upload a csv file, where the first row is the header. And
          the values are comma(,) seperated.</small>
    </form>
  </article>
  );
}



/**
 * FileInfoCard Component - Displays metadata information about an uploaded file, including its name, type, size, and row count.
 *
 * @param {Object} props - Properties passed to the component.
 * @param {string} props.fileName - The name of the uploaded file.
 * @param {string} props.fileType - The MIME type of the file.
 * @param {number} props.fileSize - The size of the file in bytes.
 * @param {number} props.fileRows - The number of data rows in the file.
 *
 * @returns {JSX.Element} - A structured card element that lists file information.
 */
function FileInfoCard({
  fileName,
  fileType,
  fileSize,
  fileRows
}: {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileRows: number;
}): JSX.Element {
  return (
    <article className="file-info-card">
      <header className="file-info-card__header">
        <h2>File Information</h2>
      </header>
      <ul className="file-info-card__details">
        {/* File name */}
        <li className="file-info-card__item">
          <div className="file-info-card__label">File Name:</div>
          <div className="file-info-card__value">{fileName}</div>
        </li>
        {/* File type */}
        <li className="file-info-card__item">
          <div className="file-info-card__label">File Type:</div>
          <div className="file-info-card__value">{fileType}</div>
        </li>
        {/* File size */}
        <li className="file-info-card__item">
          <div className="file-info-card__label">File Size:</div>
          <div className="file-info-card__value">{fileSize.toLocaleString()} bytes</div>
        </li>
        {/* Number of rows */}
        <li className="file-info-card__item">
          <div className="file-info-card__label">Number of Rows:</div>
          <div className="file-info-card__value">{fileRows.toLocaleString()}</div>
        </li>
      </ul>
    </article>
  );
}



function DataTableWrapper(props: {tableColumnHeadings: JSX.Element; tableRows: JSX.Element} = { tableColumnHeadings: <></>, tableRows: <></> }): JSX.Element {
  return (
    <article style={{ width: "100%" }}>
      <header>
        <h2>Data table</h2>
      </header>
      <figure id="table-content">
        <table >
          <thead id="table-content__headings">{props.tableColumnHeadings}</thead>
          <tbody id="table-content__data">{props.tableRows}</tbody>
        </table>
      </figure>
    </article>
  );
}






export default App;
