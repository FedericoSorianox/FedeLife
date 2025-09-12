import pdfplumber
import pandas as pd
import re
from io import BytesIO
import os
import sys  # Para print a stderr

def pdf_to_csv(file_path):
    """
    Convierte PDF a CSV: intenta tablas primero, luego texto + regex, fallback LLM si falla.
    """
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"El archivo {file_path} no existe")
        if not file_path.lower().endswith('.pdf'):
            raise ValueError(f"El archivo {file_path} no tiene extensión .pdf")

        with pdfplumber.open(file_path) as pdf:
            tables = []
            for page_num, page in enumerate(pdf.pages, start=1):
                table = page.extract_table()
                if table and len(table) > 1:
                    df = pd.DataFrame(table[1:], columns=table[0])
                    tables.append(df)
                    print(f"Tabla extraída de página {page_num} - {len(df)} filas", file=sys.stderr)

            if tables:
                combined_df = pd.concat(tables, ignore_index=True)
                print(f"Total tablas: {len(tables)}, filas: {len(combined_df)}", file=sys.stderr)
                combined_df = clean_df(combined_df)
                if len(combined_df) > 5:
                    return combined_df.to_csv(index=False)

        # Fallback 1: Extrae texto y parsea con regex
        print("No tablas detectadas. Intentando parseo de texto...", file=sys.stderr)
        full_text = ""
        for page in pdf.pages:
            full_text += page.extract_text(layout=True) or "" + "\n"

        csv_from_text = parse_text_to_csv(full_text)
        if csv_from_text:
            df = pd.read_csv(BytesIO(csv_from_text.encode()))
            if len(df) > 3:  # Mínimo razonable
                print(f"Parseo texto exitoso: {len(df)} filas", file=sys.stderr)
                return csv_from_text

        # Fallback 2: LLM
        return parse_with_llm(full_text)

    except Exception as e:
        print(f"Error procesando PDF: {e}", file=sys.stderr)
        return None

def clean_df(df):
    """Limpia DataFrame básico."""
    numeric_cols = df.select_dtypes(include=['object']).columns[df.apply(lambda col: col.str.match(r'^-?\d+[.,]?\d*$', na=False)).any()]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col].str.replace(',', '.').str.replace('.', '', regex=False), errors='coerce')
    df = df.dropna(thresh=2)
    return df

def parse_text_to_csv(text):
    """Parser regex línea por línea."""
    lines = [line for line in text.split('\n') if line.strip()]
    transactions = []

    for line in lines:
        parsed = parse_line(line)
        if parsed:
            transactions.append(parsed)

    if len(transactions) < 3:
        return None

    df = pd.DataFrame(transactions)
    df['Monto_USD'] = df['Monto_USD'].fillna('')
    df = df.reindex(columns=['Fecha', 'Codigo', 'Descripcion', 'Cuotas', 'Monto_UYU', 'Monto_USD', 'Tipo'], fill_value='')
    return df.to_csv(index=False, encoding='utf-8')

def parse_line(line):
    """Parser mejorado: lookahead para desc, findall para montos."""
    line = line.rstrip()
    if len(line) < 20:
        return None

    num_pattern = r'-?\d+(?:\.\d{3})*(?:,\d{2})'

    # Casos especiales (saldos, pagos, seguro)
    if 'SALDO DEL ESTADO DE CUENTA ANTERIOR' in line:
        amounts = re.findall(num_pattern, line)
        if len(amounts) >= 2:
            uyu = float(amounts[-2].replace('.', '').replace(',', '.'))
            usd = float(amounts[-1].replace('.', '').replace(',', '.'))
            return {'Fecha': '', 'Codigo': '', 'Descripcion': 'SALDO ANTERIOR', 'Cuotas': '', 'Monto_UYU': uyu, 'Monto_USD': usd, 'Tipo': 'Saldo'}
    if 'PAGOS' in line:
        date_match = re.search(r'(\d{2})\s+(\d{2})\s+(\d{2})', line)
        amounts = re.findall(num_pattern, line)
        if date_match and len(amounts) >= 2:
            date_str = f"{date_match.group(1)}/{date_match.group(2)}/{date_match.group(3)}"
            uyu = float(amounts[-2].replace('.', '').replace(',', '.'))
            usd = float(amounts[-1].replace('.', '').replace(',', '.'))
            return {'Fecha': date_str, 'Codigo': '', 'Descripcion': 'PAGOS', 'Cuotas': '', 'Monto_UYU': uyu, 'Monto_USD': usd, 'Tipo': 'Pago'}
    if 'SEGURO DE VIDA SOBRE SALDO' in line:
        amounts = re.findall(num_pattern, line)
        if len(amounts) >= 2:
            uyu = float(amounts[0].replace('.', '').replace(',', '.'))
            usd = float(amounts[1].replace('.', '').replace(',', '.'))
            return {'Fecha': '', 'Codigo': '', 'Descripcion': 'SEGURO DE VIDA', 'Cuotas': '', 'Monto_UYU': uyu, 'Monto_USD': usd, 'Tipo': 'Cargo'}
    if 'SALDO CONTADO' in line:
        amounts = re.findall(num_pattern, line)
        if len(amounts) >= 2:
            uyu = float(amounts[-2].replace('.', '').replace(',', '.'))
            usd = float(amounts[-1].replace('.', '').replace(',', '.'))
            return {'Fecha': '', 'Codigo': '', 'Descripcion': 'SALDO FINAL', 'Cuotas': '', 'Monto_UYU': uyu, 'Monto_USD': usd, 'Tipo': 'Saldo'}

    # Transacciones: lookahead para parar desc antes de montos
    trans_pattern = r'^\s*(\d{2})\s+(\d{2})\s+(\d{2})\s+(?P<code>\d{4})?\s+(?P<desc>.+?)(?=\s{4,}' + num_pattern + r')'
    match = re.match(trans_pattern, line)
    if match:
        day, month, year = match.group(1, 2, 3)
        code = match.group('code') or ''
        desc = match.group('desc').strip()
        # Cuotas
        cuota_match = re.search(r'(\d+/\d+)', desc)
        cuotas = cuota_match.group(1) if cuota_match else ''
        if cuotas:
            desc = re.sub(r'\s*' + re.escape(cuotas) + r'\s*', '', desc).strip()
        # Montos en remaining
        remaining = line[match.end():].strip()
        amounts = re.findall(num_pattern, remaining)
        if not amounts:  # Sin monto, ignora
            return None
        uyu_str = amounts[-1]
        usd_str = amounts[-2] if len(amounts) > 1 else None
        uyu = float(uyu_str.replace('.', '').replace(',', '.'))
        usd = float(usd_str.replace('.', '').replace(',', '.')) if usd_str else None
        return {'Fecha': f"{day}/{month}/{year}", 'Codigo': code, 'Descripcion': desc, 'Cuotas': cuotas, 'Monto_UYU': uyu, 'Monto_USD': usd, 'Tipo': 'Transacción'}

    return None

def parse_with_llm(text):
    """Fallback LLM (tu código igual)."""
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    prompt = """
    Extrae transacciones de este estado de cuenta Itaú Uruguay. Columnas: Fecha (DD/MM/YY), Código (4 dígitos o vacío), Descripción, Cuotas (dd/dd o vacío), Monto_UYU (float con , para decimal, - para débitos), Monto_USD (float o vacío si no hay).
    Solo transacciones, saldos y cargos. Ignora headers/footer/promociones. Output solo CSV, sin extras.
    Texto: """ + text[:10000]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    content = response.choices[0].message.content
    return content.strip() if content else ""

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        result = pdf_to_csv(file_path)
        if result:
            print(result)
        else:
            print("Error: No se pudo procesar el PDF", file=sys.stderr)
            sys.exit(1)
    else:
        print("Uso: python pdfconverter.py <ruta_al_archivo_pdf>", file=sys.stderr)
        sys.exit(1)