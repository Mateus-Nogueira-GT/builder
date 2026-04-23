#!/usr/bin/env python3
"""Convert the playbook Markdown to a styled PDF using WeasyPrint."""

import markdown
from weasyprint import HTML

MD_PATH = "docs/playbook-publicacao-loja.md"
PDF_PATH = "docs/playbook-publicacao-loja.pdf"

CSS = """
@page {
    size: A4;
    margin: 25mm 20mm;
    @bottom-center {
        content: "Pagina " counter(page) " de " counter(pages);
        font-size: 9px;
        color: #999;
        font-family: 'Segoe UI', Arial, sans-serif;
    }
}
body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.7;
    color: #1a1a1a;
    max-width: 100%;
}
h1 {
    font-size: 26px;
    color: #059669;
    border-bottom: 3px solid #059669;
    padding-bottom: 10px;
    margin-top: 0;
}
h2 {
    font-size: 20px;
    color: #065f46;
    border-bottom: 1px solid #d1d5db;
    padding-bottom: 6px;
    margin-top: 30px;
    page-break-after: avoid;
}
h3 {
    font-size: 16px;
    color: #047857;
    margin-top: 20px;
    page-break-after: avoid;
}
hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 25px 0;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 12px;
    page-break-inside: avoid;
}
th {
    background-color: #059669;
    color: white;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
}
td {
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
}
tr:nth-child(even) td {
    background-color: #f9fafb;
}
code {
    background-color: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'Courier New', monospace;
    color: #059669;
}
pre {
    background-color: #1e293b;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    font-size: 12px;
    overflow-x: auto;
    page-break-inside: avoid;
}
pre code {
    background: none;
    color: #e2e8f0;
    padding: 0;
}
blockquote {
    border-left: 4px solid #059669;
    margin: 15px 0;
    padding: 10px 16px;
    background-color: #ecfdf5;
    color: #065f46;
    border-radius: 0 6px 6px 0;
    page-break-inside: avoid;
}
blockquote p {
    margin: 4px 0;
}
ul, ol {
    padding-left: 24px;
}
li {
    margin-bottom: 4px;
}
a {
    color: #059669;
    text-decoration: none;
}
strong {
    color: #111827;
}
input[type="checkbox"] {
    margin-right: 6px;
}
"""

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

html_body = markdown.markdown(
    md_content,
    extensions=["tables", "fenced_code", "nl2br"],
)

full_html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>"""

HTML(string=full_html).write_pdf(PDF_PATH)
print(f"PDF gerado com sucesso: {PDF_PATH}")
