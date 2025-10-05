declare module 'pdf-parse-fixed' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer): Promise<PDFData>;
  export = pdfParse;
}
