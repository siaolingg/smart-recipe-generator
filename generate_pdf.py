import os
import re
import subprocess
import markdown

md_path = r"C:\Users\User\.gemini\antigravity\brain\14a27eed-5a45-4fa5-b065-62e7df2da13d\laporan_evaluasi_fitur_video_dan_rekomendasi_cooking_companion.md"
html_path = r"c:\Users\User\Documents\Final Project Soft-Eng\temp_report.html"
pdf_path = r"c:\Users\User\Documents\Final Project Soft-Eng\Laporan_Evaluasi_Fitur_Video_Smart_Recipe_Generator.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    raw_md = f.read()

# Replace KaTeX / math blocks with clean HTML
raw_md = raw_md.replace(
    r"$$\text{Waktu Respons Pembuatan Resep} \le 15\text{ detik (persentil ke-95)}$$",
    '<div class="formula-box"><strong>Target NFR-03:</strong> Waktu Respons Pembuatan Resep &le; 15 detik (persentil ke-95)</div>'
)

# Replace alert blocks > [!TIP]
raw_md = re.sub(
    r'>\s*\[!TIP\]\s*\n>\s*(.*)',
    r'<div class="alert-box alert-tip"><strong>Rangkuman Efisiensi Biaya:</strong> \1</div>',
    raw_md
)

# Convert Markdown to HTML
html_body = markdown.markdown(raw_md, extensions=['tables', 'fenced_code', 'nl2br'])

html_document = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Evaluasi Teknis & Rekomendasi Fitur - Smart Recipe Generator</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-right {{
      content: counter(page);
      font-size: 9pt;
      color: #64748b;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }}
    @bottom-left {{
      content: "Smart Recipe Generator - Engineering Evaluation Report";
      font-size: 8.5pt;
      color: #94a3b8;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }}
  }}

  * {{
    box-sizing: border-box;
  }}

  body {{
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 10.5pt;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }}

  /* Header styles */
  .doc-header {{
    border-bottom: 2px solid #0284c7;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }}

  .badge-category {{
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    font-weight: 700;
    font-size: 8.5pt;
    padding: 4px 10px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 10px;
  }}

  h1 {{
    color: #0f172a;
    font-size: 18pt;
    font-weight: 800;
    line-height: 1.25;
    margin: 0 0 6px 0;
  }}

  h2 {{
    color: #0284c7;
    font-size: 13pt;
    font-weight: 700;
    margin: 24px 0 10px 0;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 5px;
    page-break-after: avoid;
  }}

  h3 {{
    color: #334155;
    font-size: 11pt;
    font-weight: 700;
    margin: 16px 0 6px 0;
    page-break-after: avoid;
  }}

  /* Metadata Box */
  .metadata-grid {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 16px 0;
    display: table;
    width: 100%;
    font-size: 9.5pt;
  }}

  .metadata-row {{
    display: table-row;
  }}

  .metadata-label {{
    display: table-cell;
    font-weight: 700;
    color: #475569;
    padding: 3px 12px 3px 0;
    width: 140px;
    white-space: nowrap;
  }}

  .metadata-value {{
    display: table-cell;
    color: #0f172a;
    padding: 3px 0;
  }}

  p, li {{
    color: #334155;
    text-align: justify;
  }}

  ul, ol {{
    margin: 8px 0 14px 20px;
    padding: 0;
  }}

  li {{
    margin-bottom: 5px;
  }}

  blockquote {{
    margin: 14px 0;
    padding: 10px 16px;
    background: #f1f5f9;
    border-left: 4px solid #0284c7;
    border-radius: 0 6px 6px 0;
    font-style: italic;
    color: #1e293b;
  }}

  /* Table styles */
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }}

  th {{
    background: #0f172a;
    color: #ffffff;
    font-weight: 600;
    padding: 9px 10px;
    text-align: left;
    border: 1px solid #334155;
  }}

  td {{
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }}

  tr:nth-child(even) td {{
    background: #f8fafc;
  }}

  /* Alert / Callout Box */
  .alert-box {{
    margin: 16px 0;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }}

  .alert-tip {{
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
    border-left: 5px solid #22c55e;
  }}

  .formula-box {{
    background: #f8fafc;
    border: 1px dashed #0284c7;
    color: #0369a1;
    padding: 10px 14px;
    border-radius: 6px;
    margin: 12px 0;
    text-align: center;
    font-family: 'Consolas', monospace;
    font-size: 9.5pt;
  }}

  /* Code & Diagram */
  pre {{
    background: #0f172a;
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: 6px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 8.5pt;
    line-height: 1.45;
    overflow-x: auto;
    page-break-inside: avoid;
    border: 1px solid #1e293b;
  }}

  code {{
    background: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: 'Consolas', monospace;
    font-size: 9pt;
  }}

  pre code {{
    background: transparent;
    color: inherit;
    padding: 0;
  }}

  hr {{
    border: none;
    height: 1px;
    background: #e2e8f0;
    margin: 24px 0;
  }}

  .footer-note {{
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 8.5pt;
    color: #64748b;
    text-align: center;
  }}

  .page-break {{
    page-break-before: always;
  }}
</style>
</head>
<body>

<div class="doc-header">
  <div class="badge-category">Dokumen Resmi Rekayasa Perangkat Lunak & Arsitektur AI</div>
  <h1>LAPORAN EVALUASI TEKNIS & REKOMENDASI FITUR</h1>
  <div style="font-size: 12pt; font-weight: 600; color: #475569;">Proyek Smart Recipe Generator — Spec-Driven AI Execution</div>
</div>

<div class="metadata-grid">
  <div class="metadata-row">
    <div class="metadata-label">Topik Evaluasi</div>
    <div class="metadata-value">Kajian Kelayakan Fitur Video Memasak AI & Rekomendasi Fitur "AI Cooking Companion"</div>
  </div>
  <div class="metadata-row">
    <div class="metadata-label">Penyusun</div>
    <div class="metadata-value">Tim Rekayasa Perangkat Lunak & AI Integration</div>
  </div>
  <div class="metadata-row">
    <div class="metadata-label">Ditujukan Kepada</div>
    <div class="metadata-value">Tim Dokumentasi Proyek (Laporan Akhir, Spesifikasi Agile, Artefak Scrum)</div>
  </div>
  <div class="metadata-row">
    <div class="metadata-label">Tanggal Terbit</div>
    <div class="metadata-value">11 November 2026</div>
  </div>
  <div class="metadata-row">
    <div class="metadata-label">Status Usulan</div>
    <div class="metadata-value">Disetujui sebagai Rancangan Baseline Rekomendasi Resmi</div>
  </div>
</div>

{html_body}

<div class="footer-note">
  Smart Recipe Generator &copy; 2026 &bull; Dibuat untuk Kelengkapan Laporan Akhir & Artefak Proses Rekayasa Perangkat Lunak Agile
</div>

</body>
</html>
"""

# Clean up raw markdown headers if duplicated
# Remove the first two headers since we put them in doc-header
clean_body = re.sub(r'<h1>.*?</h1>', '', html_body, count=1)
clean_body = re.sub(r'<h2>PROYEK SMART RECIPE GENERATOR</h2>', '', clean_body, count=1)
# Remove the original metadata text since we displayed it in metadata-grid
clean_body = re.sub(r'<p><strong>Topik:</strong>.*?</p>', '', clean_body, flags=re.DOTALL)

# Reassemble
html_document = html_document.replace(f"{html_body}", clean_body)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_document)

print(f"HTML generated at {html_path}")

# Run headless Chrome to print PDF
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
cmd = [
    chrome_path,
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    html_path
]

print("Executing Chrome headless...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Chrome exit code:", res.returncode)
if os.path.exists(pdf_path):
    print(f"SUCCESS! PDF created at: {pdf_path}")
    print(f"File size: {os.path.getsize(pdf_path)} bytes")
else:
    print("FAILED to create PDF with Chrome. Output:", res.stderr)
