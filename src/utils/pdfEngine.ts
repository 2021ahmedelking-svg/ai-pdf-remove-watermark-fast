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
 * Loads an image file directly into PDFPageData format
 */
export async function loadAndRenderImageFile(
  file: File | Blob
): Promise<{ pages: PDFPageData[]; rawPdfBase64: string; totalPages: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const pages: PDFPageData[] = [
          {
            pageNumber: 1,
            originalCanvasDataUrl: dataUrl,
            cleanedCanvasDataUrl: null,
            width: img.width || 1200,
            height: img.height || 1600,
            aspectRatio: (img.width || 1200) / (img.height || 1600),
            detectedWatermarks: [],
            isProcessing: false,
          },
        ];
        resolve({
          pages,
          rawPdfBase64: dataUrl,
          totalPages: 1,
        });
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Generates ready-to-test realistic watermarked sample PDFs on the fly using pdf-lib
 */
export async function createSamplePdf(type: 'contract' | 'academic' | 'invoice' | 'arabic_exam'): Promise<{ file: File; name: string }> {
  if (type === 'arabic_exam') {
    // Generate an Egyptian/Arab biology exam sample with vertebra diagram, graph, red numbers (١), (٢), and faint watermark 0114...
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      // White paper
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1200, 1600);

      // Question 13 Container / Header with Light Blue Background
      ctx.save();
      // Light blue rounded question container
      ctx.fillStyle = '#f0f6fc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(60, 40, 1080, 80, 12);
      ctx.fill();
      ctx.stroke();

      // Red Question Badge (1)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(1070, 52, 56, 56, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('١', 1098, 90);

      // Question Header Text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText('الدعامة في الكائنات الحية والتركيب العظمي - ادرسه جيدًا ثم أجب :', 1050, 88);
      ctx.restore();

      // Red Question 1
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 22px sans-serif';
      ctx.direction = 'rtl';
      ctx.fillText('(١)  في أي منطقة توجد الفقرة المقابلة في جسم الإنسان ؟', 1140, 160);

      // Dotted underline
      ctx.fillStyle = '#334155';
      ctx.font = '20px monospace';
      ctx.fillText('.......................................................................................................', 1140, 200);

      // Red Question 2
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('(٢)  أي مكونات الجهاز العصبي المركزي يمر في التركيب (X) ؟', 1140, 250);
      ctx.fillStyle = '#334155';
      ctx.fillText('.......................................................................................................', 1140, 290);

      // Red Question 3
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('(٣)  أي أجزاء الجمجمة يتمفصل مع التركيب (Y) ؟', 1140, 340);
      ctx.fillStyle = '#334155';
      ctx.fillText('.......................................................................................................', 1140, 380);

      // Vertebra Diagram illustration (Yellow bone body, purple facets, black pointer arrows)
      ctx.save();
      // Bone Body (yellow/tan)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(300, 260, 85, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#a16207';
      ctx.stroke();

      // Neural arch hole
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(300, 250, 32, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Articular facets (purple)
      ctx.fillStyle = '#9333ea';
      ctx.beginPath();
      ctx.arc(245, 220, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(355, 220, 16, 0, Math.PI * 2);
      ctx.fill();

      // Pointer Arrow X (to canal)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(180, 250);
      ctx.lineTo(270, 250);
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.direction = 'ltr';
      ctx.fillText('X', 155, 258);

      // Pointer Arrow Y (to facet)
      ctx.beginPath();
      ctx.moveTo(415, 195);
      ctx.lineTo(370, 215);
      ctx.stroke();
      ctx.fillText('Y', 425, 195);
      ctx.restore();

      // Divider Line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60, 440);
      ctx.lineTo(1140, 440);
      ctx.stroke();

      // Question 14 Header
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.direction = 'rtl';
      ctx.fillText('١٤  الرسم البياني المقابل يوضح كمية المواد المترسبة في جدر بعض الخلايا النباتية (A, B, C, D) :', 1140, 490);

      // Legend for Bar Chart (Cellulose, Lignin, Suberin, Cutin)
      ctx.save();
      const lx = 480;
      const ly = 540;

      // Cutin (Yellow)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(lx + 480, ly - 18, 22, 22);
      ctx.strokeRect(lx + 480, ly - 18, 22, 22);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('كيوتين', lx + 470, ly);

      // Suberin (Pink)
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(lx + 340, ly - 18, 22, 22);
      ctx.strokeRect(lx + 340, ly - 18, 22, 22);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('سيوبرين', lx + 330, ly);

      // Lignin (Green)
      ctx.fillStyle = '#bbf7d0';
      ctx.fillRect(lx + 200, ly - 18, 22, 22);
      ctx.strokeRect(lx + 200, ly - 18, 22, 22);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('لجنين', lx + 190, ly);

      // Cellulose (Light Blue)
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(lx + 60, ly - 18, 22, 22);
      ctx.strokeRect(lx + 60, ly - 18, 22, 22);
      ctx.fillStyle = '#1e293b';
      ctx.fillText('سليلوز', lx + 50, ly);
      ctx.restore();

      // Red Question 14 (1)
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 22px sans-serif';
      ctx.direction = 'rtl';
      ctx.fillText('(١)  ما نوع الدعامة التي تتميز بها الخلايا (A) و (C) ؟', 1140, 600);
      ctx.fillStyle = '#334155';
      ctx.fillText('.......................................................................................................', 1140, 640);

      // Red Question 14 (2)
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('(٢)  ما نوع النسيج الذي تمثله الخلايا (D) ؟', 1140, 690);
      ctx.fillStyle = '#334155';
      ctx.fillText('.......................................................................................................', 1140, 730);

      // Red Question 14 (3)
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('(٣)  أي الخلايا تفقد دعامتها أسرع عند الجفاف ؟', 1140, 780);
      ctx.fillStyle = '#334155';
      ctx.fillText('.......................................................................................................', 1140, 820);

      // Plant Cells Bar Chart with Cyan Gridlines
      ctx.save();
      const bx = 140;
      const by = 1150;
      const bw = 460;
      const bh = 240;

      // Cyan Gridlines
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const yLine = by - (bh / 5) * i;
        ctx.beginPath();
        ctx.moveTo(bx, yLine);
        ctx.lineTo(bx + bw, yLine);
        ctx.stroke();
      }
      for (let j = 0; j <= 5; j++) {
        const xLine = bx + (bw / 5) * j;
        ctx.beginPath();
        ctx.moveTo(xLine, by);
        ctx.lineTo(xLine, by - bh);
        ctx.stroke();
      }

      // Graph Axes (Cyan Blue)
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by - bh - 10);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + bw + 10, by);
      ctx.stroke();

      // Axis Labels
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 16px sans-serif';
      ctx.direction = 'rtl';
      ctx.fillText('كمية المادة', bx + 60, by - bh - 18);
      ctx.fillText('الخلايا', bx + bw + 40, by + 5);

      // Bars:
      // Bar A (Cellulose blue + Suberin pink)
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.fillRect(bx + 40, by - 140, 40, 140);
      ctx.strokeRect(bx + 40, by - 140, 40, 140);
      ctx.fillStyle = '#fce7f3';
      ctx.strokeStyle = '#db2777';
      ctx.fillRect(bx + 80, by - 70, 40, 70);
      ctx.strokeRect(bx + 80, by - 70, 40, 70);

      // Bar B (Cellulose blue tall)
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0284c7';
      ctx.fillRect(bx + 150, by - 210, 45, 210);
      ctx.strokeRect(bx + 150, by - 210, 45, 210);

      // Bar C (Cellulose blue + Lignin green)
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(bx + 230, by - 140, 40, 140);
      ctx.strokeRect(bx + 230, by - 140, 40, 140);
      ctx.fillStyle = '#dcfce7';
      ctx.strokeStyle = '#16a34a';
      ctx.fillRect(bx + 270, by - 210, 40, 210);
      ctx.strokeRect(bx + 270, by - 210, 40, 210);

      // Bar D (Cellulose blue + Cutin yellow)
      ctx.fillStyle = '#e0f2fe';
      ctx.strokeStyle = '#0284c7';
      ctx.fillRect(bx + 345, by - 140, 40, 140);
      ctx.strokeRect(bx + 345, by - 140, 40, 140);
      ctx.fillStyle = '#fef9c3';
      ctx.strokeStyle = '#ca8a04';
      ctx.fillRect(bx + 385, by - 70, 40, 70);
      ctx.strokeRect(bx + 385, by - 70, 40, 70);

      // Labels (A), (B), (C), (D)
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('(A)', bx + 80, by + 28);
      ctx.fillText('(B)', bx + 172, by + 28);
      ctx.fillText('(C)', bx + 270, by + 28);
      ctx.fillText('(D)', bx + 385, by + 28);
      ctx.restore();

      // ========================================================
      // FAINT WATERMARKS (Crossing container and bar chart)
      // ========================================================
      ctx.save();
      // 1. Right Margin Phone Number Watermark (01143387848)
      ctx.fillStyle = 'rgba(180, 185, 195, 0.45)';
      ctx.font = 'bold 22px sans-serif';
      ctx.direction = 'ltr';
      ctx.fillText('01143387848 / 01099234851', 30, 950);
      ctx.fillText('01143387848 / 01099234851', 30, 1350);

      // 2. Large Diagonal Faint Background Watermark crossing the whole document
      ctx.translate(600, 750);
      ctx.rotate((-32 * Math.PI) / 180);
      ctx.fillStyle = 'rgba(195, 202, 214, 0.38)';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('أ / محمد الشناوي - 01143387848', 0, -420);
      ctx.fillText('مذكرات الأحياء للثانوية العامة 2026', 0, -200);
      ctx.fillText('أ / محمد الشناوي - 01143387848', 0, 80);
      ctx.fillText('مذكرات الأحياء للثانوية العامة 2026', 0, 320);
      ctx.restore();

      const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      return {
        file: new File([blob], 'egyptian-biology-exam-watermarked.png', { type: 'image/png' }),
        name: 'egyptian-biology-exam-watermarked.png',
      };
    }
  }

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
