import os
import re
import unicodedata
from typing import Tuple, Dict, Any

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    import docx
except ImportError:
    docx = None

class DocumentIngester:
    def clean_text(self, text: str) -> str:
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Normalize unicode
        text = unicodedata.normalize('NFKC', text)
        return text.strip()

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        stat = os.stat(file_path)
        return {
            "size_bytes": stat.st_size,
            "modified_time": stat.st_mtime
        }

    def parse(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        ext = file_path.split('.')[-1].lower()
        metadata = self.extract_metadata(file_path)
        text = ""

        if ext == 'pdf':
            if not PdfReader:
                raise ImportError("PyPDF2 is required for PDF parsing")
            reader = PdfReader(file_path)
            if reader.metadata:
                metadata.update(reader.metadata)
            pages = []
            for i, page in enumerate(reader.pages):
                try:
                    pages.append(page.extract_text() or "")
                except Exception as e:
                    print(f"Error extracting page {i}: {e}")
            text = "\n".join(pages)

        elif ext == 'docx':
            if not docx:
                raise ImportError("python-docx is required for DOCX parsing")
            doc = docx.Document(file_path)
            metadata["title"] = doc.core_properties.title
            metadata["author"] = doc.core_properties.author
            text = "\n".join([para.text for para in doc.paragraphs])

        elif ext in ['txt', 'md']:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            for enc in encodings:
                try:
                    with open(file_path, 'r', encoding=enc) as f:
                        text = f.read()
                    break
                except UnicodeDecodeError:
                    continue
        else:
            raise ValueError(f"Unsupported file extension: {ext}")

        text = self.clean_text(text)
        return text, metadata