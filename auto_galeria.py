import os, requests, json, time, re, shutil

# --- CONFIGURACIÓN ---
TOKEN = "rALAHWJ0SExTajxBQ8JUq02nlwFG0oDUwKsCQczGe3605909" 
CARPETA_RAIZ = "galeria_a_subir"
ARCHIVO_JS = "src/data/lista_imagenes.js"
ARCHIVO_PROGRESO = "progreso_galeria.json"
LIMITE_SUBIDA = 20 # Bloques de 20 para máxima estabilidad de la API

# Rutas absolutas automáticas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_JS = os.path.join(BASE_DIR, ARCHIVO_JS)
RUTA_GALERIA = os.path.join(BASE_DIR, CARPETA_RAIZ)
RUTA_PROGRESO = os.path.join(BASE_DIR, ARCHIVO_PROGRESO)

headers = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}

def ejecutar():
    print(">>> Iniciando sistema de automatización efectivo...")
    
    if not os.path.exists(RUTA_JS):
        print(f"❌ No se encontró el archivo: {RUTA_JS}"); return
    if not os.path.exists(RUTA_GALERIA):
        print(f"❌ No se encontró la carpeta: {RUTA_GALERIA}"); return

    # 1. COPIA DE SEGURIDAD
    shutil.copy2(RUTA_JS, RUTA_JS + ".bak")

    # 2. EXTRAER DATOS CON REGEX (Inmune a errores de comas/formato)
    galeria = {}
    with open(RUTA_JS, "r", encoding="utf-8") as f:
        content = f.read()

    # Buscamos categorías (Regex mejorada para capturar bloques completos)
    cat_blocks = re.finditer(r'"(?P<cat>[^"]+)":\s*\{(?P<block>.*?)\n\s*\}(?:,)?', content, re.DOTALL)
    for cb in cat_blocks:
        cat_name = cb.group('cat')
        block_text = cb.group('block')
        if cat_name not in galeria: galeria[cat_name] = {}
        
        # Buscamos personajes y sus links
        pj_matches = re.finditer(r'"(?P<pj>[^"]+)":\s*\[(?P<links>.*?)\]', block_text, re.DOTALL)
        for pm in pj_matches:
            pj_name = pm.group('pj')
            links_raw = pm.group('links')
            links_list = re.findall(r'"(https://[^"]+)"', links_raw)
            galeria[cat_name][pj_name] = links_list

    print(f">>> Datos actuales cargados. Categorías: {list(galeria.keys())}")

    # 3. CARGAR PROGRESO LOCAL
    progreso = {}
    if os.path.exists(RUTA_PROGRESO):
        try:
            with open(RUTA_PROGRESO, "r", encoding="utf-8") as f:
                progreso = json.load(f)
        except: progreso = {}

    # 4. IDENTIFICAR FOTOS NUEVAS
    cola_subida = []
    for cat_folder in sorted(os.listdir(RUTA_GALERIA)):
        ruta_cat = os.path.join(RUTA_GALERIA, cat_folder)
        if not os.path.isdir(ruta_cat): continue
        
        if cat_folder not in galeria: galeria[cat_folder] = {}
        if cat_folder not in progreso: progreso[cat_folder] = {}

        for pj_folder in sorted(os.listdir(ruta_cat)):
            ruta_pj = os.path.join(ruta_cat, pj_folder)
            if not os.path.isdir(ruta_pj): continue
            
            if pj_folder not in galeria[cat_folder]: galeria[cat_folder][pj_folder] = []
            if pj_folder not in progreso[cat_folder]: progreso[cat_folder][pj_folder] = []

            extensiones = ('.png', '.jpg', '.jpeg', '.webp')
            fotos = sorted([f for f in os.listdir(ruta_pj) if f.lower().endswith(extensiones)])
            
            for f in fotos:
                if f not in progreso[cat_folder][pj_folder]:
                    cola_subida.append({"ruta": os.path.join(ruta_pj, f), "cat": cat_folder, "pj": pj_folder, "f": f})

    if not cola_subida:
        print("✅ No hay nada nuevo que subir."); return

    # CORRECCIÓN AQUÍ: Cambiado cola_global por cola_subida
    print(f">>> Subiendo {len(cola_subida)} fotos en lotes de {LIMITE_SUBIDA}...")

    # 5. SUBIDA Y ESCRITURA SEGURA
    for i in range(0, len(cola_subida), LIMITE_SUBIDA):
        lote = cola_subida[i : i + LIMITE_SUBIDA]
        payload = []
        manejadores = []
        
        for item in lote:
            file_obj = open(item["ruta"], 'rb')
            manejadores.append(file_obj)
            payload.append(('images[]', (item["f"], file_obj, 'image/jpeg')))

        try:
            res = requests.post("https://api.imgchest.com/v1/post", headers=headers, files=payload, data={'nsfw': 'true'})
            if res.status_code in [200, 201]:
                links = [img['link'] for img in res.json()['data']['images']]
                for idx, link in enumerate(links):
                    info = lote[idx]
                    galeria[info["cat"]][info["pj"]].append(link)
                    progreso[info["cat"]][info["pj"]].append(info["f"])

                # Guardamos cambios tras cada éxito
                with open(RUTA_PROGRESO, "w", encoding="utf-8") as f:
                    json.dump(progreso, f, indent=4)
                
                with open(RUTA_JS, "w", encoding="utf-8") as f:
                    f.write("export const galeria_maestra = " + json.dumps(galeria, indent=4) + ";\n")
                
                print(f"   [OK] Lote {i//LIMITE_SUBIDA + 1} finalizado.")
                time.sleep(12)
            elif res.status_code == 429:
                print("⚠️ Límite de API alcanzado. Deteniendo..."); break
            else:
                print(f"❌ Error API {res.status_code}"); break
        finally:
            for f in manejadores: f.close()

    print("\n🎉 Proceso terminado con éxito.")

if __name__ == "__main__":
    ejecutar()