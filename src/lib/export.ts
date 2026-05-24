import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Setlist, Gig, Song } from '@/types';
import { formatDuration, formatTotalDuration } from '@/data/songs';

// ── Shared: fetch logo as base64 ──────────────────────────────────────────────

async function getLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch(window.location.origin + '/logo_black.png');
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Shared: page header ───────────────────────────────────────────────────────

async function addPageHeader(doc: jsPDF, gig: Gig) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const logo = await getLogoBase64();
  if (logo) {
    doc.addImage(logo, 'PNG', margin, 8, 55, 16);
  } else {
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('EVERY SECOND TUESDAY', margin, 18);
  }

  // Gig info right-aligned
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(130, 130, 130);
  [gig.name, gig.date, gig.venue].filter(Boolean).forEach((line, i) => {
    doc.text(line, pageWidth - margin, 10 + i * 4.5, { align: 'right' });
  });

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, 28, pageWidth - margin, 28);
}

function addTableFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, finalY, pageWidth - margin, finalY);
  doc.setFontSize(7); doc.setTextColor(170, 170, 170);
  doc.text(
    `Generated ${new Date().toLocaleDateString()}  ·  everysecondtuesday.ca  ·  @everysecondtuesday`,
    pageWidth / 2, finalY + 5, { align: 'center' }
  );
}

// ── Set-level PDF export ──────────────────────────────────────────────────────

export async function exportSetlistPDF(setlist: Setlist, gig: Gig, allSongs: Song[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  await addPageHeader(doc, gig);

  // Setlist title
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
  doc.text(setlist.name.toUpperCase(), margin, 38);

  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = allSongs.find(song => song.id === item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
  doc.text(`${setlist.songs.length} songs  ·  ${formatTotalDuration(totalSecs)}`, pageWidth - margin, 38, { align: 'right' });

  const tableData: string[][] = [];
  setlist.songs.forEach((item, i) => {
    const song = allSongs.find(s => s.id === item.songId);
    if (song) tableData.push([`${i + 1}`, song.title, song.artist, song.decade, song.mood, formatDuration(song.duration)]);
  });

  autoTable(doc, {
    startY: 45,
    head: [['#', 'TITLE', 'ARTIST', 'ERA', 'MOOD', 'TIME']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [40, 40, 40], lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 18, halign: 'center', textColor: [120, 120, 120] },
      4: { cellWidth: 28, textColor: [120, 120, 120] },
      5: { cellWidth: 18, halign: 'right', textColor: [120, 120, 120] },
    },
  });

  addTableFooter(doc);
  doc.save(`${gig.name}-${setlist.name}.pdf`.replace(/\s+/g, '-').toLowerCase());
}

// ── Gig-level PDF export ──────────────────────────────────────────────────────

export async function exportGigPDF(gig: Gig, setlists: Setlist[], allSongs: Song[]) {
  try {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();

  await addPageHeader(doc, gig);

  // Gig title
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
  doc.text(gig.name.toUpperCase(), margin, 38);

  // Total gig duration
  const gigTotalSecs = setlists.reduce((acc, sl) =>
    acc + sl.songs.reduce((a, item) => {
      const s = allSongs.find(song => song.id === item.songId);
      return a + (s?.duration ?? 0);
    }, 0), 0);

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
  doc.text(
    `${setlists.length} sets  ·  ${setlists.reduce((a, sl) => a + sl.songs.length, 0)} songs  ·  ${formatTotalDuration(gigTotalSecs)}`,
    pageWidth - margin, 38, { align: 'right' }
  );

  let currentY = 46;

  setlists.forEach((setlist, setIndex) => {
    const setTotalSecs = setlist.songs.reduce((acc, item) => {
      const s = allSongs.find(song => song.id === item.songId);
      return acc + (s?.duration ?? 0);
    }, 0);

    // Section header for each set
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20);
    doc.text(setlist.name.toUpperCase(), margin, currentY);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(180, 50, 50);
    doc.text(formatTotalDuration(setTotalSecs), pageWidth - margin, currentY, { align: 'right' });
    currentY += 2;

    const tableData: string[][] = [];
    setlist.songs.forEach((item, i) => {
      const song = allSongs.find(s => s.id === item.songId);
      if (song) tableData.push([`${i + 1}`, song.title, song.artist, song.decade, formatDuration(song.duration)]);
    });

    autoTable(doc, {
      startY: currentY + 2,
      head: [['#', 'TITLE', 'ARTIST', 'ERA', 'TIME']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, textColor: [40, 40, 40], lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 68, fontStyle: 'bold' },
        2: { cellWidth: 52 },
        3: { cellWidth: 20, halign: 'center', textColor: [130, 130, 130] },
        4: { cellWidth: 20, halign: 'right', textColor: [130, 130, 130] },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + (setIndex < setlists.length - 1 ? 10 : 8);
  });

  // Footer
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  doc.setFontSize(7); doc.setTextColor(170, 170, 170);
  doc.text(
    `Generated ${new Date().toLocaleDateString()}  ·  everysecondtuesday.ca  ·  @everysecondtuesday`,
    pageWidth / 2, currentY + 5, { align: 'center' }
  );

  doc.save(`${gig.name}-full-gig.pdf`.replace(/\s+/g, '-').toLowerCase());
}catch (e) {
    console.error('exportGigPDF failed:', e);
    throw e;
  }
}
// ── Print (set level) ─────────────────────────────────────────────────────────

export function printSetlist(setlist: Setlist, gig: Gig, allSongs: Song[]) {
  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = allSongs.find(song => song.id === item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  const rows = setlist.songs.map((item, i) => {
    const s = allSongs.find(song => song.id === item.songId);
    if (!s) return '';
    return `<tr>
      <td style="color:#888;width:28px;">${i + 1}</td>
      <td><strong>${s.title}</strong><br/><span style="color:#888;font-size:11px;">${s.artist}</span></td>
      <td style="color:#888;">${s.decade}</td>
      <td style="color:#888;">${s.mood}</td>
      <td style="text-align:right;color:#888;">${formatDuration(s.duration)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><title>${gig.name} — ${setlist.name}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #111; }
    h1 { font-size: 26px; letter-spacing: 0.1em; margin: 0 0 4px; }
    .meta { color: #888; font-size: 12px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; border-bottom: 2px solid #111; padding: 6px 8px; font-size: 10px; letter-spacing: 0.08em; }
    td { padding: 7px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    .total { text-align: right; margin-top: 16px; font-size: 22px; font-weight: bold; color: #cc0000; }
    .footer { margin-top: 40px; font-size: 10px; color: #ccc; text-align: center; }
    @media print { body { margin: 20px; } }
  </style></head><body>
  <h1>${setlist.name.toUpperCase()}</h1>
  <div class="meta">${gig.name}${gig.date ? ' · ' + gig.date : ''}${gig.venue ? ' · ' + gig.venue : ''}</div>
  <table><thead><tr><th>#</th><th>TITLE</th><th>ERA</th><th>MOOD</th><th style="text-align:right">TIME</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="total">${formatTotalDuration(totalSecs)}</div>
  <div class="footer">Every Second Tuesday · everysecondtuesday.ca · @everysecondtuesday</div>
  <script>window.onload = () => window.print();</script>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}
