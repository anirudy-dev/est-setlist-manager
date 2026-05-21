import { Setlist, Gig } from '@/types';
import { getSongById, formatDuration, formatTotalDuration } from '@/data/songs';

export async function exportSetlistPDF(setlist: Setlist, gig: Gig) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  doc.setFillColor(8, 8, 8);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('EVERY SECOND TUESDAY', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text("nostalgic party rock from the '70s — 2010s", margin, 27);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  const gigInfo = [gig.name, gig.venue, gig.date].filter(Boolean).join('  ·  ');
  doc.text(gigInfo, margin, 37);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 42, pageWidth, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(setlist.name.toUpperCase(), margin, 53);

  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = getSongById(item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${setlist.songs.length} songs  ·  ${formatTotalDuration(totalSecs)}`,
    pageWidth - margin,
    53,
    { align: 'right' }
  );

  const tableData: string[][] = [];
  setlist.songs.forEach((item, index) => {
    const song = getSongById(item.songId);
    if (song) {
      tableData.push([
        `${index + 1}`,
        song.title,
        song.artist,
        song.decade,
        song.mood,
        formatDuration(song.duration),
      ]);
    }
  });

  autoTable(doc, {
    startY: 62,
    head: [['#', 'TITLE', 'ARTIST', 'ERA', 'MOOD', 'TIME']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: [40, 40, 40],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [20, 20, 20],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 60, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 18, halign: 'center', textColor: [100, 100, 100] },
      4: { cellWidth: 28, textColor: [100, 100, 100] },
      5: { cellWidth: 18, halign: 'right', textColor: [100, 100, 100] },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, finalY, pageWidth - margin, finalY);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated ${new Date().toLocaleDateString()}  ·  everysecondtuesday.ca  ·  @everysecondtuesday`,
    pageWidth / 2,
    finalY + 5,
    { align: 'center' }
  );

  doc.save(`${gig.name}-${setlist.name}.pdf`.replace(/\s+/g, '-').toLowerCase());
}

export function printSetlist(setlist: Setlist, gig: Gig) {
  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = getSongById(item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  const rows = setlist.songs
    .map((item, i) => {
      const song = getSongById(item.songId);
      if (!song) return '';
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="title">${song.title}</td>
        <td class="artist">${song.artist}</td>
        <td class="era">${song.decade}</td>
        <td class="mood">${song.mood}</td>
        <td class="dur">${formatDuration(song.duration)}</td>
      </tr>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${gig.name} — ${setlist.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Space Mono', monospace; background: #fff; color: #000; padding: 20mm; }
    .header { background: #000; color: #fff; padding: 12px 16px; margin-bottom: 0; }
    .header h1 { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
    .header .sub { font-size: 9px; color: #999; margin-top: 2px; letter-spacing: 1px; }
    .meta { background: #f0f0f0; padding: 8px 16px; font-size: 10px; color: #555; display: flex; justify-content: space-between; margin-bottom: 16px; }
    .setlist-name { font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #000; color: #fff; padding: 6px 8px; text-align: left; font-size: 9px; letter-spacing: 1px; }
    td { padding: 7px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #fafafa; }
    .num { width: 24px; color: #aaa; text-align: center; }
    .title { font-weight: bold; }
    .artist { color: #555; }
    .era, .mood, .dur { color: #888; font-size: 10px; }
    .dur { text-align: right; }
    .footer { margin-top: 16px; font-size: 8px; color: #aaa; display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 8px; }
    @media print { body { padding: 10mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>EVERY SECOND TUESDAY</h1>
    <div class="sub">nostalgic party rock from the '70s — 2010s</div>
  </div>
  <div class="meta">
    <span>${[gig.name, gig.venue, gig.date].filter(Boolean).join('  ·  ')}</span>
    <span>${setlist.songs.length} songs  ·  ${formatTotalDuration(totalSecs)}</span>
  </div>
  <div class="setlist-name">${setlist.name.toUpperCase()}</div>
  <table>
    <thead><tr><th>#</th><th>TITLE</th><th>ARTIST</th><th>ERA</th><th>MOOD</th><th>TIME</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>everysecondtuesday.ca  ·  @everysecondtuesday</span>
    <span>${new Date().toLocaleDateString()}</span>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
