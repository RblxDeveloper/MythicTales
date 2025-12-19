
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
  doc.setLineWidth(0.8);
  doc.rect(10, 10, width - 20, height - 20, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(48);
  const titleLines = doc.splitTextToSize(story.title.toUpperCase(), width - 60);
  doc.text(titleLines, width / 2, height / 2 - 15, { align: 'center' });
  
  doc.setFontSize(20);
  doc.setFont('times', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(`A ${story.genre} Chronicle`, width / 2, height / 2 + 25, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('times', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text("GENERATED VIA MYTHOS PERSONAL EDITION", width / 2, height - 25, { align: 'center' });

  // Story Pages
  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i];
    doc.addPage();
    
    // Split point exactly at 50%
    const splitPoint = width / 2;

    // LEFT HALF: IMAGE (FULL SCREEN SIDE)
    if (page.imageUrl) {
      try {
        // High precision placement for full-bleed feel
        doc.addImage(page.imageUrl, 'JPEG', 0, 0, splitPoint, height);
      } catch (e) {
        doc.setFillColor(241, 245, 249);
        doc.rect(0, 0, splitPoint, height, 'F');
      }
    } else {
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 0, splitPoint, height, 'F');
    }

    // RIGHT HALF: TEXT SIDE (Paper like background)
    doc.setFillColor(253, 251, 247); 
    doc.rect(splitPoint, 0, splitPoint, height, 'F');
    
    // Spine inner shadow line
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(splitPoint, 0, splitPoint, height);
    
    const margin = 28;
    const textWidth = splitPoint - (margin * 2);
    const cleanText = page.text.replace(/[*_#]/g, ''); // Remove MD markers for cleaner PDF
    
    // Folio Tag
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text(`FOLIO ${i + 1} / ${story.pages.length}`, splitPoint + margin, 25);

    // Body Text
    doc.setTextColor(20, 20, 20);
    doc.setFont('times', 'normal');
    doc.setFontSize(15);
    
    const textLines = doc.splitTextToSize(cleanText, textWidth);
    doc.text(textLines, splitPoint + margin, 45, { lineHeightFactor: 1.65 });
    
    // Decorative Page Number
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`— ${i + 1} —`, splitPoint + (splitPoint / 2), height - 15, { align: 'center' });
  }

  doc.save(`${story.title.replace(/\s+/g, '_')}_Mythos_Chronicle.pdf`);
};
