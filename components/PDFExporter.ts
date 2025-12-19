
import { jsPDF } from 'jspdf';
import { Story } from '../types';

export const exportToPDF = async (story: Story) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Title Page
  doc.setFillColor(0, 0, 0); 
  doc.rect(0, 0, width, height, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(50);
  doc.text(story.title.toUpperCase(), width / 2, height / 2, { align: 'center' });
  doc.setFontSize(14);
  doc.setFont('times', 'italic');
  doc.text(`A ${story.genre} Narrative`, width / 2, height / 2 + 20, { align: 'center' });

  // Story Pages
  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i];
    doc.addPage();
    const splitPoint = width / 2;

    // LEFT: IMAGE
    if (page.imageUrl) {
      try {
        doc.addImage(page.imageUrl, 'JPEG', 0, 0, splitPoint, height);
      } catch (e) {
        doc.setFillColor(240, 240, 240); doc.rect(0, 0, splitPoint, height, 'F');
      }
    } else {
      doc.setFillColor(240, 240, 240); doc.rect(0, 0, splitPoint, height, 'F');
    }

    // RIGHT: TEXT
    doc.setFillColor(255, 255, 255); doc.rect(splitPoint, 0, splitPoint, height, 'F');
    doc.setDrawColor(230, 230, 230); doc.line(splitPoint, 0, splitPoint, height);
    
    const margin = 25;
    const textWidth = splitPoint - (margin * 2);
    const cleanText = page.text.replace(/[*_#]/g, '');
    
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text(`PAGE ${i + 1}`, splitPoint + margin, 25);

    doc.setTextColor(30, 30, 30);
    doc.setFont('times', 'normal');
    doc.setFontSize(15);
    const textLines = doc.splitTextToSize(cleanText, textWidth);
    doc.text(textLines, splitPoint + margin, 45, { lineHeightFactor: 1.6 });
    
    doc.setFontSize(10);
    doc.setTextColor(210, 210, 210);
    doc.text(`— ${i + 1} —`, splitPoint + (splitPoint / 2), height - 15, { align: 'center' });
  }

  doc.save(`${story.title.replace(/\s+/g, '_')}_MythicTales.pdf`);
};
