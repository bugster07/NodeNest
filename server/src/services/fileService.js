
import { PDFParse } from "pdf-parse";

export const extractText = async (file) => {
  if (file.mimetype === "text/plain") {
    return file.buffer.toString("utf-8");
  }

  if (file.mimetype === "application/pdf") {
    const parser = new PDFParse({
      data: file.buffer,
    });

    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Only PDF and TXT files are supported");
};
