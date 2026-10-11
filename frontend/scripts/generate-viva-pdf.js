import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finished } from 'node:stream/promises';
import PDFDocument from 'pdfkit';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '../..');
const sourcePath = path.join(projectDirectory, 'docs', 'PAWCONNECT_VIVA.md');
const outputPath = path.join(projectDirectory, 'PawConnect-Viva-Guide.pdf');
const source = fs.readFileSync(sourcePath, 'utf8');
const sections = [];
let currentSection;
let currentQuestion;

for (const line of source.split(/\r?\n/)) {
  if (line.startsWith('## ')) {
    currentSection = { title: line.slice(3), questions: [] };
    sections.push(currentSection);
    currentQuestion = null;
  } else if (line.startsWith('### ')) {
    currentQuestion = { question: line.slice(4), answer: '' };
    currentSection?.questions.push(currentQuestion);
  } else if (currentQuestion && line.startsWith('A: ')) {
    currentQuestion.answer = line.slice(3);
  }
}

const document = new PDFDocument({
  size: 'A4',
  margins: { top: 56, bottom: 58, left: 56, right: 56 },
  bufferPages: true,
  info: { Title: 'PawConnect Viva Questions and Answers', Author: 'PawConnect Project' },
});
const output = fs.createWriteStream(outputPath);
document.pipe(output);

function addPageLabel() {
  document.save();
  document.fillColor('#21664d').font('Helvetica-Bold').fontSize(8)
    .text('PAWCONNECT  /  VIVA STUDY GUIDE', 56, 30, { characterSpacing: 0.8 });
  document.restore();
}

function ensureSpace(height) {
  if (document.y + height > document.page.height - 68) {
    document.addPage();
    addPageLabel();
  }
}

document.rect(0, 0, document.page.width, 166).fill('#12372b');
document.fillColor('#dceee0').font('Helvetica-Bold').fontSize(9)
  .text('COMMUNITY ANIMAL CARE', 56, 38, { characterSpacing: 1.5 });
document.fillColor('#ffffff').font('Helvetica-Bold').fontSize(28)
  .text('PawConnect', 56, 67);
document.fillColor('#e7f1e7').font('Helvetica').fontSize(11)
  .text('Project Viva Questions and Answers', 57, 112);
document.fillColor('#21664d').font('Helvetica-Bold').fontSize(9)
  .text('FROM PROJECT BASICS TO DEPLOYMENT', 56, 192, { characterSpacing: 1.1 });
document.fillColor('#43584d').font('Helvetica').fontSize(10)
  .text('A concise guide to the application, its files, request flow, database, security, and hosting.', 56, 210, { width: 482, lineGap: 3 });
document.y = 250;

for (const section of sections) {
  ensureSpace(42);
  document.moveDown(0.6);
  document.fillColor('#12372b').font('Helvetica-Bold').fontSize(17).text(section.title);
  document.moveDown(0.45);

  for (const item of section.questions) {
    const questionOptions = { width: 482, lineGap: 2 };
    const answerOptions = { width: 482, lineGap: 3 };
    const questionHeight = document.font('Helvetica-Bold').fontSize(10.5).heightOfString(item.question, questionOptions);
    const answerHeight = document.font('Helvetica').fontSize(9.5).heightOfString(item.answer, answerOptions);
    ensureSpace(questionHeight + answerHeight + 20);
    document.fillColor('#21664d').font('Helvetica-Bold').fontSize(10.5)
      .text(item.question, { width: 482, lineGap: 2 });
    document.moveDown(0.2);
    document.fillColor('#34463c').font('Helvetica').fontSize(9.5)
      .text(item.answer, { width: 482, lineGap: 3 });
    document.moveDown(0.7);
  }
}

const pages = document.bufferedPageRange();
for (let index = 0; index < pages.count; index += 1) {
  document.switchToPage(pages.start + index);
  document.save();
  document.strokeColor('#dbe6dc').lineWidth(0.6)
    .moveTo(56, document.page.height - 43).lineTo(document.page.width - 56, document.page.height - 43).stroke();
  document.fillColor('#718077').font('Helvetica').fontSize(8)
    .text(`PawConnect  |  ${index + 1}`, 56, document.page.height - 34, { width: 482, align: 'right' });
  document.restore();
}

document.end();
await finished(output);
console.log(`Created ${path.relative(projectDirectory, outputPath)} with ${sections.reduce((total, section) => total + section.questions.length, 0)} questions.`);