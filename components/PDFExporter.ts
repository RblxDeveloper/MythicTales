
import { jsPDF } from 'jspdf';
import { Story } from '../types';

export const exportToPDF = async (story: Story) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Title Page
  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, width, height, 'F');
  
  // Decorative Gold Border
  doc.setDrawColor(199, 153, 0); 
  doc.setLineWidth(0.5);
  doc.rect(15, 15, width - 30, height - 30, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(54);
  doc.text(story.title.toUpperCase(), width / 2, height / 2 - 10, { align: 'center' });
  
  doc.setFontSize(24);
  doc.setFont('times', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(`A ${story.genre} Legend forged in Mythos`, width / 2, height / 2 + 10, { align: 'center' });

  // Story Pages
  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i];
    doc.addPage();
    
    // Split point at 50%
    const splitPoint = width / 2;

    // LEFT HALF: IMAGE (FULL SCREEN SIDE)
    if (page.imageUrl) {
      try {
        // We use cover-style logic for the left side
        doc.addImage(page.imageUrl, 'JPEG', 0, 0, splitPoint, height);
      } catch (e) {
        doc.setFillColor(241, 245, 249);
        doc.rect(0, 0, splitPoint, height, 'F');
      }
    } else {
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 0, splitPoint, height, 'F');
    }

    // RIGHT HALF: TEXT
    doc.setFillColor(254, 253, 251); // Paper-like off-white
    doc.rect(splitPoint, 0, splitPoint, height, 'F');
    
    // Spine shadow
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(1);
    doc.line(splitPoint, 0, splitPoint, height);
    
    const margin = 25;
    const textWidth = splitPoint - (margin * 2);
    // Remove Markdown markers for PDF text as jsPDF doesn't render MD natively
    const cleanText = page.text.replace(/[*_#]/g, '');
    
    // Folio Info
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text(`FOLIO ${i + 1} OF ${story.pages.length}`, splitPoint + margin, 20);

    // Body Text
    doc.setTextColor(30, 41, 59);
    doc.setFont('times', 'normal');
    doc.setFontSize(16);
    
    const textLines = doc.splitTextToSize(cleanText, textWidth);
    doc.text(textLines, splitPoint + margin, 45, { lineHeightFactor: 1.6 });
    
    // Page number
    doc.setFontSize(11);
    doc.setTextColor(210, 210, 210);
    doc.text(`${i + 1}`, width - 15, height - 15, { align: 'right' });
  }

  doc.save(`${story.title.replace(/\s+/g, '_')}_Chronicle.pdf`);
};
