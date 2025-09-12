#!/usr/bin/env python3
"""
Script de ejemplo para probar la función pdf_to_csv
"""

from funciones.pdfconverter import pdf_to_csv
import os

def test_pdf_converter():
    """
    Función de ejemplo para demostrar el uso de pdf_to_csv
    """
    # Ruta de ejemplo (reemplaza con un PDF real)
    pdf_path = "/Users/fede/Downloads/estadodecuenta.pdf"  # Cambia esto por la ruta de tu PDF

    if os.path.exists(pdf_path):
        print(f"Procesando PDF: {pdf_path}")
        csv_content = pdf_to_csv(pdf_path)

        if csv_content:
            # Guardar el resultado como archivo CSV
            output_path = pdf_path.replace('.pdf', '.csv')
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(csv_content)
            print(f"CSV guardado en: {output_path}")
        else:
            print("No se encontraron tablas en el PDF")
    else:
        print(f"El archivo {pdf_path} no existe. Crea un PDF de prueba o especifica la ruta correcta.")

if __name__ == "__main__":
    test_pdf_converter()
