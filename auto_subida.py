import os, requests, json, time, re, shutil

# --- CONFIGURACIÓN ---
TOKEN = "rALAHWJ0SExTajxBQ8JUq02nlwFG0oDUwKsCQczGe3605909" 
CARPETA_RAIZ = "mangas_a_subir"
ARCHIVO_JS = "src/data/lista_mangas.js"
ARCHIVO_PROGRESO = "progreso_detallado.json"
BLOQUE = 20 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_PROGRESO = os.path.join(BASE_DIR, ARCHIVO_PROGRESO)
RUTA_JS = os.path.join(BASE_DIR, ARCHIVO_JS)
RUTA_MANGAS = os.path.join(BASE_DIR, CARPETA_RAIZ)

headers = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}

def ejecutar():
    print(">>> Iniciando script de Mangas Blindado v2...")

    if not os.path.exists(RUTA_MANGAS):
        print(f"❌ Error: No existe {RUTA_MANGAS}"); return

    # 1. Backup de seguridad
    if os.path.exists(RUTA_JS): shutil.copy2(RUTA_JS, RUTA_JS + ".bak")

    # 2. Leer JS con Regex (INMUNE a errores de caracteres de control)
    biblioteca = {}
    if os.path.exists(RUTA_JS):
        with open(RUTA_JS, "r", encoding="utf-8") as f:
            content = f.read()
        manga_matches = re.finditer(r'"(?P<manga>[^"]+)":\s*\[(?P<links>[^\]]*)\]', content)
        for match in manga_matches:
            manga_name = match.group('manga')
            links_raw = match.group('links')
            links_list = re.findall(r'"(https://[^"]+)"', links_raw)
            biblioteca[manga_name] = links_list

    # 3. Leer Progreso Local
    progreso = {}
    if os.path.exists(RUTA_PROGRESO) and os.path.getsize(RUTA_PROGRESO) > 0:
        try:
            with open(RUTA_PROGRESO, "r", encoding="utf-8") as f:
                progreso = json.load(f)
        except: pass

    # 4. SINCRONIZACIÓN MAESTRA (Esto arreglará Himitsuna automáticamente)
    for m, links in progreso.items():
        if m not in biblioteca or len(links) > len(biblioteca.get(m, [])):
            biblioteca[m] = links

    mangas_encontrados = [f for f in os.listdir(RUTA_MANGAS) if os.path.isdir(os.path.join(RUTA_MANGAS, f))]
    hubo_subidas = False

    for folder in sorted(mangas_encontrados):
        ruta_c = os.path.join(RUTA_MANGAS, folder)
        manga = folder.strip()
        
        if manga not in biblioteca: biblioteca[manga] = []
        
        extensiones = ('.png', '.jpg', '.jpeg', '.webp')
        imagenes = sorted([f for f in os.listdir(ruta_c) if f.lower().endswith(extensiones)])
        total_imagenes = len(imagenes)
        links_actuales = len(biblioteca[manga])

        if links_actuales >= total_imagenes:
            print(f"   [SALTADO] {manga} ya está completo ({links_actuales}/{total_imagenes}).")
            continue

        print(f"\n>>> SUBIENDO: {manga} ({links_actuales}/{total_imagenes})")
        hubo_subidas = True
        chunks = [imagenes[i:i + BLOQUE] for i in range(links_actuales, total_imagenes, BLOQUE)]

        for chunk in chunks:
            payload = []
            manejadores = []
            for img in chunk:
                f = open(os.path.join(ruta_c, img), 'rb')
                manejadores.append(f)
                payload.append(('images[]', (img, f, 'image/jpeg')))

            try:
                res = requests.post("https://api.imgchest.com/v1/post", headers=headers, files=payload, data={'title': f"{manga}", 'nsfw': 'true'})
                if res.status_code in [200, 201]:
                    nuevos = [img['link'] for img in res.json()['data']['images']]
                    biblioteca[manga].extend(nuevos)
                    
                    # Guardado en tiempo real
                    with open(RUTA_PROGRESO, "w", encoding="utf-8") as f:
                        json.dump(biblioteca, f, indent=4)
                    with open(RUTA_JS, "w", encoding="utf-8") as f:
                        f.write("export const bibliotecaMangas = " + json.dumps(biblioteca, indent=4) + ";\n")
                    
                    print(f"      [OK] Subidas {len(nuevos)} imágenes.")
                    time.sleep(10)
                elif res.status_code == 429:
                    print("⚠️ Límite de velocidad. Espera 1 hora."); return
                else:
                    print(f"   [!] Error API: {res.status_code}"); return
            finally:
                for f in manejadores: f.close()

    # 5. FORZAR GUARDADO FINAL SIEMPRE
    with open(RUTA_PROGRESO, "w", encoding="utf-8") as f:
        json.dump(biblioteca, f, indent=4)
    with open(RUTA_JS, "w", encoding="utf-8") as f:
        f.write("export const bibliotecaMangas = " + json.dumps(biblioteca, indent=4) + ";\n")
    print("\n✅ Archivos sincronizados exitosamente.")

if __name__ == "__main__":
    ejecutar()