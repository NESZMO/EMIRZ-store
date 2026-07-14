import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportReportPDF(
  storeName: string,
  title: string,
  summary: { label: string; value: string }[],
  tableHead: string[],
  tableRows: (string | number)[][],
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(storeName, 14, 18);
  doc.setFontSize(11);
  doc.text(title, 14, 26);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 14, 32);

  let y = 40;
  summary.forEach((s) => {
    doc.text(`${s.label}: ${s.value}`, 14, y);
    y += 6;
  });

  autoTable(doc, {
    startY: y + 4,
    head: [tableHead],
    body: tableRows.map((r) => r.map(String)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 90, 60] },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, "_")}.pdf`);
}
