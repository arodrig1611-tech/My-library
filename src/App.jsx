import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import './App.css';

import { bibliotecaMangas } from './data/lista_mangas';
import { galeria_maestra } from './data/lista_imagenes';
import { lista_animes } from './data/lista_animes';

import GalleryGrid from './components/GalleryGrid';
import Reader from './components/Reader';

function App() {
  const [tab, setTab] = useState('mangas');
  const [filter, setFilter] = useState('');
  const [activeCat, setActiveCat] = useState('TODOS');
  const [activeSerie, setActiveSerie] = useState(null);
  const [activeAlbum, setActiveAlbum] = useState(null);
  const [readingMangaKey, setReadingMangaKey] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIdx, setModalIdx] = useState(0);

  // Memoización de datos mejorada (Inmune a mayúsculas en capítulos)
  const mangasData = useMemo(() => {
    const seriesMap = {};
    Object.keys(bibliotecaMangas).forEach(key => {
      // Buscamos _ch o _Vol sin importar si está en mayúsculas o minúsculas
      const match = key.match(/(.*)(_ch|_Vol)(.*)/i);
      let baseName = key.replace(/_/g, ' ').trim();
      let label = "Completo";

      if (match) {
        baseName = match[1].replace(/_/g, ' ').trim();
        // Limpiamos el texto del capítulo quitando guiones bajos por espacios
        label = `Cap ${match[3].replace(/_/g, ' ').replace(/-/g, ' ').trim()}`;
      }

      if (!seriesMap[baseName]) {
        seriesMap[baseName] = { nombre: baseName, caps: [], portada: bibliotecaMangas[key][0], type: 'manga' };
      }
      seriesMap[baseName].caps.push({ key, label });
    });
    
    // Ordenamos los capítulos internamente para que aparezcan en orden (ej: Cap 1, Cap 41)
    Object.values(seriesMap).forEach(manga => {
      manga.caps.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    });

    return Object.values(seriesMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, []);

  const galeriaFlat = useMemo(() => {
    const items = [];
    Object.entries(galeria_maestra).forEach(([cat, personajes]) => {
      Object.entries(personajes).forEach(([nom, links]) => {
        links.forEach(url => {
          
          // Magia Negra: Si es de la categoría "Real", pasamos la URL por el proxy optimizador
          const isReal = cat === 'Real';
          const thumbUrl = isReal 
            ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&output=webp` 
            : url;

          items.push({ 
            r: url,          // r = La URL original de Imgchest (pesada, para el Visor Modal)
            thumb: thumbUrl, // thumb = La URL comprimida por el proxy (ligera, para la cuadrícula)
            p: nom, 
            sub: cat, 
            g: nom 
          });
        });
      });
    });
    return items;
  }, []);

  const animesData = useMemo(() => {
    return Object.entries(lista_animes).map(([nombre, url]) => ({ nombre, url, type: 'anime' })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, []);

  // Función de Click congelada para evitar LAG
  const handleItemClick = useCallback((item) => {
    if (item.type === 'back') {
      if (item.color === 'var(--pastel-green)') setActiveSerie(null);
      else setActiveAlbum(null);
      window.scrollTo(0,0);
      return;
    }

    if (item.type === 'manga') {
      if (item.caps.length > 1) setActiveSerie(item);
      else setReadingMangaKey(item.caps[0].key);
    } 
    else if (item.type === 'manga_cap') setReadingMangaKey(item.key);
    else if (item.type === 'anime') window.open(item.url, '_blank');
    else if (item.type === 'album') { setActiveAlbum(item.g); window.scrollTo(0,0); } 
    else if (item.type === 'real') {
      setSelectedItems(prev => {
        const newSel = new Set(prev);
        if (newSel.has(item.r)) newSel.delete(item.r);
        else newSel.add(item.r);
        return newSel;
      });
    }
  }, []);

  const itemsToRender = useMemo(() => {
    const q = filter.toLowerCase();
    if (tab === 'mangas') {
      if (activeSerie) {
        const items = activeSerie.caps.map(c => ({ key: c.key, nombre: `${activeSerie.nombre} - ${c.label}`, portada: bibliotecaMangas[c.key][0], type: 'manga_cap' }));
        return [{ type: 'back', nombre: '⬅ Volver a Biblioteca', color: 'var(--pastel-green)' }, ...items];
      }
      return mangasData.filter(m => m.nombre.toLowerCase().includes(q));
    }
    if (tab === 'galeria') {
      if (activeAlbum) {
        const imgs = galeriaFlat.filter(i => i.g === activeAlbum).map(i => ({...i, type: 'real'}));
        return [{ type: 'back', nombre: '⬅ Volver', color: 'var(--pastel-purple)' }, ...imgs];
      }
      const groups = [...new Set(galeriaFlat.map(i => i.g))].sort();
      const results = [];
      groups.forEach(g => {
        const data = galeriaFlat.filter(i => i.g === g);
        const item = data[0];
        if (q && !item.p.toLowerCase().includes(q.replace(/ /g, '_'))) return;
        if (activeCat !== 'TODOS' && item.sub !== activeCat) return;
        if (item.sub === 'Real') data.forEach(d => results.push({ ...d, type: 'real' }));
        else results.push({ ...item, data, type: 'album' });
      });
      return results;
    }
    return animesData.filter(a => a.nombre.toLowerCase().includes(q));
  }, [tab, filter, activeCat, activeSerie, activeAlbum, mangasData, galeriaFlat, animesData]);

  // Lógica de Modal y Swipe (se mantiene igual pero optimizada)
  const selectedArr = useMemo(() => Array.from(selectedItems), [selectedItems]);
  const changeModal = useCallback((dir) => {
  setModalIdx((prev) => (prev + dir + selectedArr.length) % selectedArr.length);
}, [selectedArr.length]);

  const touchStart = useRef({ x: 0, y: 0, pinching: false });
  const handleTouchStart = (e) => {
    if (e.target.closest('.thumb-strip')) return;
    if (e.touches.length > 1) { touchStart.current.pinching = true; return; }
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, pinching: false };
  };
  const handleTouchEnd = (e) => {
    if (touchStart.current.pinching || e.target.closest('.thumb-strip')) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      changeModal(deltaX < 0 ? 1 : -1);
    }
  };

  // Nuevo efecto para controlar las flechas del teclado
useEffect(() => {
  if (!modalOpen) return; // Solo escuchar si el modal está abierto

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') changeModal(1);
    if (e.key === 'ArrowLeft') changeModal(-1);
    if (e.key === 'Escape') setModalOpen(false);
  };

  window.addEventListener('keydown', handleKeyDown);
  
  // Limpiamos el evento al cerrar para no gastar memoria
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [modalOpen, changeModal]);
  
  if (readingMangaKey) return <Reader mangaKey={readingMangaKey} onBack={() => setReadingMangaKey(null)} />;

  return (
    <div className="App">
      <div className="app-bg"></div>
      <nav className="nav">
        {['mangas', 'galeria', 'animes'].map(t => (
          <button key={t} className={`t-btn ${tab === t ? 'active' : ''}`} onClick={() => {setTab(t); setFilter(''); setActiveSerie(null); setActiveAlbum(null);}}>
            {t === 'mangas' ? '📚 Mangas' : t === 'galeria' ? '🖼️ Galería' : '📺 Animes'}
          </button>
        ))}
      </nav>

      <div className="f-bar">
        <input type="text" placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        {tab === 'galeria' && !activeAlbum && (
          <div className="cat-row">
            {['TODOS', 'Anime_Manga', 'Juegos', 'Comic', 'Real', 'Variados'].map(cat => (
              <button key={cat} className={`c-btn ${activeCat === cat ? 'active' : ''}`} onClick={() => setActiveCat(cat)}>{cat.replace('_', '/')}</button>
            ))}
          </div>
        )}
      </div>

      {tab === 'galeria' && (
        <div className="fab-container">
          <button className="fab" style={{color:'var(--pastel-pink)'}} onClick={() => {if(selectedItems.size) {setModalIdx(0); setModalOpen(true);}}}>👁️ Ver ({selectedItems.size})</button>
          <button className="fab" style={{color:'var(--pastel-green)'}} onClick={() => setSelectedItems(new Set())}>🧹 Limpiar</button>
        </div>
      )}

      <GalleryGrid items={itemsToRender} onItemClick={handleItemClick} selectedItems={selectedItems} />

      {/* AQUÍ ESTABA EL ERROR: Faltaba la etiqueta div de apertura */}
      {modalOpen && selectedArr.length > 0 && (
        <div id="modal" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <button className="p-btn" style={{position:'absolute', top:'20px', right:'20px', borderRadius:'50%'}} onClick={() => setModalOpen(false)}>✕</button>
          <img id="m-img" src={selectedArr[modalIdx]} alt="Visor" />
          <div className="thumb-strip">
            {selectedArr.map((url, i) => (
              <img key={url} src={url} className={`thumb-item ${i === modalIdx ? 'active' : ''}`} onClick={() => setModalIdx(i)} alt="thumb" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;