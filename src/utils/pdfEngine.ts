import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { PDFPageData } from '../types';

// Configure PDF.js worker with locally bundled worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
      new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
      { type: 'module' }
    );
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
}

/**
 * Converts a File or Blob to ArrayBuffer
 */
export async function fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

/**
 * Converts ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  const binaryString = window.atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Loads a PDF from ArrayBuffer or Uint8Array and renders all its pages into high-res data URLs
 */
export async function loadAndRenderPdf(
  data: ArrayBuffer | Uint8Array,
  scale: number = 2.0
): Promise<{ pages: PDFPageData[]; rawPdfBase64: string; totalPages: number }> {
  // Ensure we pass a clean copy Uint8Array to pdfjs so worker transfer does not detach our copy
  const uint8Copy = data instanceof Uint8Array 
    ? new Uint8Array(data) 
    : new Uint8Array(data.slice(0));

  // Compute base64 BEFORE passing to getDocument or use independent copy
  const base64 = arrayBufferToBase64(uint8Copy.buffer.slice(0));

  const loadingTask = pdfjsLib.getDocument({ 
    data: new Uint8Array(uint8Copy),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pages: PDFPageData[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!context) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // White background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    } as any).promise;

    const originalCanvasDataUrl = canvas.toDataURL('image/png', 0.95);

    pages.push({
      pageNumber: i,
      originalCanvasDataUrl,
      cleanedCanvasDataUrl: null,
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.width / viewport.height,
      detectedWatermarks: [],
      isProcessing: false,
    });
  }

  return {
    pages,
    rawPdfBase64: `data:application/pdf;base64,${base64}`,
    totalPages,
  };
}

/**
 * Generates ready-to-test realistic watermarked sample PDFs on the fly using pdf-lib
 */
export async function createSamplePdf(type: 'contract' | 'academic' | 'invoice'): Promise<{ file: File; name: string }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (type === 'contract') {
    // 2-page Business Agreement with diagonal "CONFIDENTIAL & PROPRIETARY" watermark
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page1.getSize();

    // Content
    page1.drawText('NON-DISCLOSURE & SERVICE AGREEMENT', {
      x: 60,
      y: height - 80,
      size: 18,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });

    page1.drawText('Document ID: NDA-2026-X89 | Date: August 2026', {
      x: 60,
      y: height - 105,
      size: 10,
      font: font,
      color: rgb(0.4, 0.45, 0.5),
    });

    page1.drawLine({
      start: { x: 60, y: height - 115 },
      end: { x: width - 60, y: height - 115 },
      thickness: 1,
      color: rgb(0.8, 0.82, 0.86),
    });

    const bodyParagraphs = [
      '1. PURPOSE AND RECITALS',
      'The Disclosing Party agrees to share proprietary information with the Receiving Party solely for evaluating a mutual business partnership. All confidential materials remain the exclusive property of the owner.',
      '2. OBLIGATIONS & SECURITY PROTOCOLS',
      'The Receiving Party shall exercise reasonable care and maintain strict confidentiality standards to prevent unauthorized disclosure, reproduction, or distribution to third parties.',
      '3. TERM & TERMINATION',
      'This agreement takes effect upon signature and persists for three (3) calendar years. Upon termination, all physical and electronic copies must be returned or destroyed within 14 business days.',
      '4. GOVERNING LAW & ARBITRATION',
      'Any disputes arising under this agreement shall be governed by applicable jurisdiction laws and resolved via expedited mediation.',
    ];

    let currentY = height - 150;
    for (let j = 0; j < bodyParagraphs.length; j++) {
      const isHeader = j % 2 === 0;
      page1.drawText(bodyParagraphs[j], {
        x: 60,
        y: currentY,
        size: isHeader ? 12 : 10,
        font: isHeader ? boldFont : font,
        color: isHeader ? rgb(0.15, 0.2, 0.3) : rgb(0.25, 0.28, 0.35),
        maxWidth: width - 120,
        lineHeight: 16,
      });
      currentY -= isHeader ? 25 : 55;
    }

    // Heavy Semi-transparent Diagonal Watermark
    page1.drawText('CONFIDENTIAL', {
      x: 80,
      y: height / 2 - 40,
      size: 68,
      font: boldFont,
      color: rgb(0.85, 0.2, 0.2),
      opacity: 0.22,
      rotate: degrees(45),
    });

    page1.drawText('DO NOT DISTRIBUTE', {
      x: 120,
      y: height / 2 - 110,
      size: 32,
      font: boldFont,
      color: rgb(0.85, 0.2, 0.2),
      opacity: 0.18,
      rotate: degrees(45),
    });

    // Page 2
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    page2.drawText('SIGNATURES & EXECUTION', {
      x: 60,
      y: height - 80,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });

    page2.drawText('Authorized Representative (Party A): _________________________', {
      x: 60,
      y: height - 200,
      size: 11,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    page2.drawText('Authorized Representative (Party B): _________________________', {
      x: 60,
      y: height - 280,
      size: 11,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    page2.drawText('DRAFT COPY', {
      x: 100,
      y: height / 2 - 50,
      size: 72,
      font: boldFont,
      color: rgb(0.65, 0.65, 0.7),
      opacity: 0.2,
      rotate: degrees(45),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      file: new File([pdfBytes], 'sample-confidential-agreement.pdf', { type: 'application/pdf' }),
      name: 'sample-confidential-agreement.pdf',
    };
  } else if (type === 'academic') {
    // Academic paper with repetitive header watermark and diagonal stamp
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    page.drawText('JOURNAL OF ADVANCED ARTIFICIAL INTELLIGENCE RESEARCH', {
      x: 60,
      y: height - 60,
      size: 9,
      font: boldFont,
      color: rgb(0.4, 0.4, 0.5),
    });

    // Watermark Header Bar
    page.drawText('PREVIEW COPY - FOR REVIEW ONLY - WATERMARKED', {
      x: 130,
      y: height - 78,
      size: 10,
      font: boldFont,
      color: rgb(0.8, 0.2, 0.2),
      opacity: 0.5,
    });

    page.drawLine({
      start: { x: 60, y: height - 85 },
      end: { x: width - 60, y: height - 85 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText('Neural Document Inpainting and Vector Layer Reconstruction', {
      x: 60,
      y: height - 120,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.2),
      maxWidth: width - 120,
    });

    page.drawText('Dr. A. Vance, Prof. E. Thorne, Computer Science Institute', {
      x: 60,
      y: height - 150,
      size: 10,
      font: font,
      color: rgb(0.4, 0.45, 0.5),
    });

    page.drawText('ABSTRACT', {
      x: 60,
      y: height - 190,
      size: 11,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.3),
    });

    page.drawText(
      'This paper presents a multi-stage visual synthesis pipeline capable of removing obstructive watermarks, stamps, and high-frequency noise from digital documents while mathematically restoring underlying typographic stroke boundaries and vector representations with sub-pixel precision.',
      {
        x: 60,
        y: height - 210,
        size: 9.5,
        font: font,
        color: rgb(0.3, 0.3, 0.35),
        maxWidth: width - 120,
        lineHeight: 15,
      }
    );

    // Large Center Diagonal Watermark
    page.drawText('UNLICENSED PREVIEW', {
      x: 70,
      y: height / 2 - 20,
      size: 52,
      font: boldFont,
      color: rgb(0.7, 0.7, 0.75),
      opacity: 0.25,
      rotate: degrees(40),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      file: new File([pdfBytes], 'sample-academic-preview.pdf', { type: 'application/pdf' }),
      name: 'sample-academic-preview.pdf',
    };
  } else {
    // Invoice with scanned watermark & red approval seal
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    page.drawText('COMMERCIAL TAX INVOICE', {
      x: 60,
      y: height - 80,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });

    page.drawText('Invoice #: INV-2026-9042 | Due Date: Sept 15, 2026', {
      x: 60,
      y: height - 110,
      size: 10,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Table
    page.drawRectangle({
      x: 60,
      y: height - 240,
      width: width - 120,
      height: 100,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
      color: rgb(0.97, 0.98, 1.0),
    });

    page.drawText('Description                                                   Qty         Price             Total', {
      x: 70,
      y: height - 165,
      size: 10,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.3),
    });

    page.drawText('Enterprise Cloud AI Platform Annual Plan         1         $4,800.00      $4,800.00', {
      x: 70,
      y: height - 195,
      size: 9.5,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText('Priority SLA & Security Compliance Add-on      1         $1,200.00      $1,200.00', {
      x: 70,
      y: height - 220,
      size: 9.5,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    // CamScanner-style stamp in bottom corner
    page.drawText('Scanned with CamScanner', {
      x: width - 210,
      y: 40,
      size: 11,
      font: boldFont,
      color: rgb(0.8, 0.1, 0.1),
      opacity: 0.6,
    });

    // Diagonal VOID / SAMPLE Stamp
    page.drawText('SAMPLE - NOT VALID', {
      x: 90,
      y: height / 2 - 30,
      size: 50,
      font: boldFont,
      color: rgb(0.85, 0.3, 0.3),
      opacity: 0.25,
      rotate: degrees(35),
    });

    const pdfBytes = await pdfDoc.save();
    return {
      file: new File([pdfBytes], 'sample-invoice-watermarked.pdf', { type: 'application/pdf' }),
      name: 'sample-invoice-watermarked.pdf',
    };
  }
}

/**
 * Builds a multi-page PDF from processed page canvases and downloads it
 */
export async function buildAndDownloadPdf(
  pages: PDFPageData[],
  outputFileName: string = 'cleaned-document.pdf',
  useCleanedOnly: boolean = true
): Promise<Blob> {
  // If first page exists, get orientation
  const first = pages[0];
  const isLandscape = first ? first.width > first.height : false;
  
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: first ? [first.width * 0.75, first.height * 0.75] : 'a4',
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      const p = pages[i];
      doc.addPage([p.width * 0.75, p.height * 0.75], p.width > p.height ? 'landscape' : 'portrait');
    }

    const page = pages[i];
    const dataUrl = (useCleanedOnly && page.cleanedCanvasDataUrl) ? page.cleanedCanvasDataUrl : page.originalCanvasDataUrl;
    
    // Add image to full page
    doc.addImage(
      dataUrl,
      'PNG',
      0,
      0,
      page.width * 0.75,
      page.height * 0.75,
      undefined,
      'FAST'
    );
  }

  const pdfBlob = doc.output('blob');
  return pdfBlob;
}
