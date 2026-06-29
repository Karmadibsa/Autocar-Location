// _docx-kit.js — Boîte à outils partagée pour générer les livrables NeoTravel en .docx
// Reprend la charte du Dossier de cadrage (L1) : palette teal, titres, tableaux,
// encadrés, sommaire, pied de page paginé. Utilisé par les scripts build.js de
// L2-prototype-et-artefacts, L3-documentation-de-passation et support-de-soutenance.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, TableOfContents, PageNumber, PageBreak, TabStopType, TabStopPosition,
  VerticalAlign,
} = require('docx');

// ---- Palette / constantes (identiques au L1) ----
const ACCENT = '0E7A66';      // teal foncé (titres)
const ACCENT_DK = '0A5346';   // teal très foncé
const HEAD_FILL = 'D9F0EA';   // fond entête de tableau
const ZEBRA = 'F2F8F6';       // lignes alternées
const GREY = '666666';
const CODE_FILL = 'F4F4F4';   // fond bloc de code
const CW = 9360;              // largeur contenu (US Letter, marges 1")

// ---- Helpers ----
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 120 }, children: Array.isArray(t) ? t : [new TextRun({ text: t, ...opts })] });
const run = (text, opts = {}) => new TextRun({ text, ...opts });
const code = (text, opts = {}) => new TextRun({ text, font: 'Consolas', size: 18, ...opts });
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [new TextRun(t)] });
const numbered = (t, ref = 'num') => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [new TextRun(t)] });
const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [new TextRun('')] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

function cell(content, { w, head = false, fill, bold = false, align = AlignmentType.LEFT } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    typeof c === 'string'
      ? new Paragraph({ alignment: align, spacing: { after: 0 }, children: [new TextRun({ text: c, bold: head || bold, color: head ? ACCENT_DK : '000000' })] })
      : c
  );
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { fill: head ? HEAD_FILL : (fill || 'FFFFFF'), type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    children: paras,
  });
}

function makeTable(headers, rows, widths, { zebra = true } = {}) {
  const headRow = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { w: widths[i], head: true })) });
  const bodyRows = rows.map((r, ri) =>
    new TableRow({ children: r.map((c, i) => cell(c, { w: widths[i], fill: zebra && ri % 2 ? ZEBRA : 'FFFFFF' })) })
  );
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, borders, rows: [headRow, ...bodyRows] });
}

// Encadré (callout) via paragraphe avec bordure colorée à gauche
function callout(label, text, color = ACCENT) {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color, space: 8 } },
    shading: { fill: ZEBRA, type: ShadingType.CLEAR },
    children: [new TextRun({ text: label + ' ', bold: true, color: ACCENT_DK }), ...(Array.isArray(text) ? text : [new TextRun(text)])],
  });
}

// Bloc de code monospace (une ou plusieurs lignes) sur fond gris
function codeBlock(lines) {
  const arr = Array.isArray(lines) ? lines : [lines];
  return arr.map((l, i) => new Paragraph({
    spacing: { before: i === 0 ? 80 : 0, after: i === arr.length - 1 ? 140 : 0 },
    shading: { fill: CODE_FILL, type: ShadingType.CLEAR },
    children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18 })],
  }));
}

// Page de garde standard
function cover({ logoPath, title, subtitle, livrable, date, equipe = 'Axel MOMPER · Vincent CONTER · Zakaria TOUAMI' }) {
  const out = [];
  if (logoPath && fs.existsSync(logoPath)) {
    out.push(new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER, children: [
      new ImageRun({ type: 'png', data: fs.readFileSync(logoPath), transformation: { width: 300, height: 166 }, altText: { title: 'NeoTravel', description: 'Logo NeoTravel', name: 'logo' } }),
    ] }));
  }
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 80 }, children: [new TextRun({ text: title, bold: true, size: 52, color: ACCENT })] }));
  if (subtitle) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: subtitle, size: 28, color: '333333' })] }));
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: 'NEO TRAVEL', bold: true, size: 28, color: ACCENT_DK })] }));
  if (livrable) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: livrable, italics: true, color: GREY, size: 24 })] }));
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Équipe projet : ' + equipe, size: 22, color: GREY })] }));
  out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Cas d’étude MBA1 — NeoTravel · InterstellLabs', size: 20, color: GREY })] }));
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function toc() {
  return [
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Table des matières', bold: true, size: 32, color: ACCENT })] }),
    new TableOfContents('Sommaire', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// Assemble + écrit le document
function buildDoc({ title, footerTitle, children, outPath }) {
  const doc = new Document({
    creator: 'Équipe NeoTravel',
    title,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 30, bold: true, color: ACCENT, font: 'Arial' },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 25, bold: true, color: ACCENT_DK, font: 'Arial' },
          paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
        { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      footers: { default: new Footer({ children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
        children: [
          new TextRun({ text: footerTitle, size: 16, color: GREY }),
          new TextRun({ text: '\tPage ', size: 16, color: GREY }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
          new TextRun({ text: ' / ', size: 16, color: GREY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY }),
        ],
      })] }) },
      children,
    }],
  });
  return Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(outPath, buf);
    console.log('OK ->', outPath);
  });
}

module.exports = {
  ACCENT, ACCENT_DK, GREY, HEAD_FILL, ZEBRA, CW,
  H1, H2, P, run, code, bullet, numbered, spacer, pageBreak,
  makeTable, callout, codeBlock, cover, toc, buildDoc, path,
};
