import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Setlist, Gig, Song } from '@/types';
import { formatDuration, formatTotalDuration } from '@/data/songs';

// ── PDF Export ────────────────────────────────────────────────────────────────

export async function exportSetlistPDF(setlist: Setlist, gig: Gig, allSongs: Song[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ── Logo ──────────────────────────────────────────────────────────────────
  try {
    const logoUrl = window.location.origin + '/est_logo_cropped.png';
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Place logo top-left: x=14, y=8, width=55, height=16
    doc.addImage(base64, 'PNG', margin, 8, 55, 16);
  } catch {
    // Logo failed to load — fall back to text header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('EVERY SECOND TUESDAY', margin, 18);
  }

  // ── Gig info (right-aligned) ───────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  const gigLines = [
    gig.name,
    gig.date ? gig.date : '',
    gig.venue ? gig.venue : '',
  ].filter(Boolean);
  gigLines.forEach((line, i) => {
    doc.text(line, pageWidth - margin, 10 + i * 4.5, { align: 'right' });
  });

  // ── Divider ────────────────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, 28, pageWidth - margin, 28);

  // ── Setlist name ───────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(setlist.name.toUpperCase(), margin, 38);

  // ── Song count + total duration ────────────────────────────────────────────
  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = allSongs.find(song => song.id === item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${setlist.songs.length} songs  ·  ${formatTotalDuration(totalSecs)}`,
    pageWidth - margin,
    38,
    { align: 'right' }
  );

  // ── Songs table ────────────────────────────────────────────────────────────
  const tableData: string[][] = [];
  setlist.songs.forEach((item, index) => {
    const song = allSongs.find(s => s.id === item.songId);
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
    startY: 45,
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

  // ── Footer ─────────────────────────────────────────────────────────────────
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

// ── Print ─────────────────────────────────────────────────────────────────────

export function printSetlist(setlist: Setlist, gig: Gig, allSongs: Song[]) {
  const totalSecs = setlist.songs.reduce((acc, item) => {
    const s = allSongs.find(song => song.id === item.songId);
    return acc + (s?.duration ?? 0);
  }, 0);

  const rows = setlist.songs
    .map((item, i) => {
      const s = allSongs.find(song => song.id === item.songId);
      if (!s) return '';
      return `
        <tr>
          <td style="color:#888;width:28px;">${i + 1}</td>
          <td><strong>${s.title}</strong><br/><span style="color:#888;font-size:11px;">${s.artist}</span></td>
          <td style="color:#888;">${s.decade}</td>
          <td style="color:#888;">${s.mood}</td>
          <td style="text-align:right;color:#888;">${formatDuration(s.duration)}</td>
        </tr>`;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${gig.name} — ${setlist.name}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #111; }
        h1 { font-size: 28px; letter-spacing: 0.1em; margin: 0 0 4px; }
        .meta { color: #888; font-size: 12px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; border-bottom: 2px solid #111; padding: 6px 8px; font-size: 10px; letter-spacing: 0.08em; }
        td { padding: 7px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
        .total { text-align: right; margin-top: 16px; font-size: 20px; font-weight: bold; color: #cc0000; }
        .footer { margin-top: 40px; font-size: 10px; color: #ccc; text-align: center; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <h1>${setlist.name.toUpperCase()}</h1>
      <div class="meta">
        ${gig.name}${gig.date ? ' · ' + gig.date : ''}${gig.venue ? ' · ' + gig.venue : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>TITLE</th><th>ERA</th><th>MOOD</th><th style="text-align:right">TIME</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">${formatTotalDuration(totalSecs)}</div>
      <div class="footer">Every Second Tuesday · everysecondtuesday.ca · @everysecondtuesday</div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
