import * as pdfParse from 'pdf-parse';
import { logger } from '@/lib/logger';

/**
 * PDF Module
 *
 * Extract text and metadata from PDF files
 * - Parse PDF documents
 * - Extract text content
 * - Get page count and metadata
 * - Search within PDFs
 *
 * Perfect for:
 * - Document processing
 * - Text extraction from invoices/receipts
 * - PDF analysis
 * - Data extraction workflows
 */

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PdfParseResult {
  text: string;
  numPages: number;
  metadata: PdfMetadata;
  version: string;
  info: Record<string, unknown>;
}

/**
 * Parse PDF and extract all text
 */
export async function parsePdf(input: Buffer): Promise<PdfParseResult> {
  logger.info({ inputSize: input.length }, 'Parsing PDF');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);

    logger.info(
      {
        numPages: data.numpages,
        textLength: data.text.length,
      },
      'PDF parsed successfully'
    );

    return {
      text: data.text,
      numPages: data.numpages,
      metadata: {
        title: data.info?.Title as string | undefined,
        author: data.info?.Author as string | undefined,
        subject: data.info?.Subject as string | undefined,
        keywords: data.info?.Keywords as string | undefined,
        creator: data.info?.Creator as string | undefined,
        producer: data.info?.Producer as string | undefined,
        creationDate: data.info?.CreationDate as Date | undefined,
        modificationDate: data.info?.ModDate as Date | undefined,
      },
      version: data.version,
      info: data.info,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to parse PDF');
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract only text from PDF
 */
export async function extractText(input: Buffer): Promise<string> {
  logger.info('Extracting text from PDF');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);

    logger.info({ textLength: data.text.length }, 'Text extracted from PDF');

    return data.text;
  } catch (error) {
    logger.error({ error }, 'Failed to extract text from PDF');
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get PDF metadata
 */
export async function getMetadata(input: Buffer): Promise<PdfMetadata> {
  logger.info('Getting PDF metadata');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);

    logger.info({ metadata: data.info }, 'PDF metadata retrieved');

    return {
      title: data.info?.Title as string | undefined,
      author: data.info?.Author as string | undefined,
      subject: data.info?.Subject as string | undefined,
      keywords: data.info?.Keywords as string | undefined,
      creator: data.info?.Creator as string | undefined,
      producer: data.info?.Producer as string | undefined,
      creationDate: data.info?.CreationDate as Date | undefined,
      modificationDate: data.info?.ModDate as Date | undefined,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get PDF metadata');
    throw new Error(
      `Failed to get PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get page count
 */
export async function getPageCount(input: Buffer): Promise<number> {
  logger.info('Getting PDF page count');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);

    logger.info({ pageCount: data.numpages }, 'PDF page count retrieved');

    return data.numpages;
  } catch (error) {
    logger.error({ error }, 'Failed to get PDF page count');
    throw new Error(
      `Failed to get PDF page count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Search for text in PDF
 */
export async function searchInPdf(
  input: Buffer,
  searchText: string,
  caseSensitive: boolean = false
): Promise<{
  found: boolean;
  occurrences: number;
  matches: string[];
}> {
  logger.info({ searchText, caseSensitive }, 'Searching in PDF');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);
    const text = data.text;

    let regex;
    if (caseSensitive) {
      regex = new RegExp(searchText, 'g');
    } else {
      regex = new RegExp(searchText, 'gi');
    }

    const matches = text.match(regex) || [];
    const occurrences = matches.length;

    logger.info({ found: occurrences > 0, occurrences }, 'PDF search completed');

    return {
      found: occurrences > 0,
      occurrences,
      matches: Array.from(new Set(matches)), // Unique matches
    };
  } catch (error) {
    logger.error({ error }, 'Failed to search in PDF');
    throw new Error(
      `Failed to search in PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text by line
 */
export async function extractTextByLine(input: Buffer): Promise<string[]> {
  logger.info('Extracting text by line from PDF');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);
    const lines = data.text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    logger.info({ lineCount: lines.length }, 'Text extracted by line from PDF');

    return lines;
  } catch (error) {
    logger.error({ error }, 'Failed to extract text by line from PDF');
    throw new Error(
      `Failed to extract text by line from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text by paragraph
 */
export async function extractTextByParagraph(input: Buffer): Promise<string[]> {
  logger.info('Extracting text by paragraph from PDF');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);
    const paragraphs = data.text
      .split(/\n\n+/)
      .map((para: string) => para.trim())
      .filter((para: string) => para.length > 0);

    logger.info({ paragraphCount: paragraphs.length }, 'Text extracted by paragraph from PDF');

    return paragraphs;
  } catch (error) {
    logger.error({ error }, 'Failed to extract text by paragraph from PDF');
    throw new Error(
      `Failed to extract text by paragraph from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract words from PDF
 */
export async function extractWords(input: Buffer): Promise<string[]> {
  logger.info('Extracting words from PDF');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = ((pdfParse as any).default || pdfParse) as any;
    const data = await pdf(input);
    const words = data.text
      .split(/\s+/)
      .map((word: string) => word.trim())
      .filter((word: string) => word.length > 0);

    logger.info({ wordCount: words.length }, 'Words extracted from PDF');

    return words;
  } catch (error) {
    logger.error({ error }, 'Failed to extract words from PDF');
    throw new Error(
      `Failed to extract words from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get word count
 */
export async function getWordCount(input: Buffer): Promise<number> {
  logger.info('Getting PDF word count');

  try {
    const words = await extractWords(input);
    const count = words.length;

    logger.info({ wordCount: count }, 'PDF word count retrieved');

    return count;
  } catch (error) {
    logger.error({ error }, 'Failed to get PDF word count');
    throw new Error(
      `Failed to get PDF word count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get character count
 */
export async function getCharacterCount(input: Buffer): Promise<number> {
  logger.info('Getting PDF character count');

  try {
    const text = await extractText(input);
    const count = text.length;

    logger.info({ characterCount: count }, 'PDF character count retrieved');

    return count;
  } catch (error) {
    logger.error({ error }, 'Failed to get PDF character count');
    throw new Error(
      `Failed to get PDF character count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
