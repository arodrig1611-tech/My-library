import React, { useState, useEffect } from 'react';
import { bibliotecaMangas } from '../data/lista_mangas';

const Reader = ({ mangaKey, onBack }) => {
  const [zoom, setZoom] = useState(850);
  const [mode, setMode] = useState('normal'); // 'normal', 'fit', 'double'
  const [showUI, setShowUI] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [progress, setProgress] = useState(0);

  const pages = bibliotecaMangas[mangaKey] || [];

  useEffect(() => {
    window.scrollTo(0, 0); // Subir arriba al abrir un manga

    const handleScroll = () => {
      const s = document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress((s / h) * 100);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setCurrentPage(parseInt(entry.target.dataset.idx) + 1);
        }
      });
    }, { rootMargin: "-40% 0px -40% 0px" });

    window.addEventListener('scroll', handleScroll);
    document.querySelectorAll('.page').forEach(img => observer.observe(img));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [pages]);

  const pageStyle = mode === 'normal' ? { maxWidth: `${zoom}px` } : {};

  return (
    <div id="reader-container">
      <div style={{ position: 'fixed', top: 0, left: 0, height: '4px', background: 'var(--pastel-blue)', width: `${progress}%`, zIndex: 10000, transition: 'width 0.1s' }}></div>
      
      {showUI ? (
        <div id="sideBar">
          <div style={{ fontSize: '12px', textAlign: 'center', marginBottom: '8px', color: 'var(--pastel-blue)', fontWeight: 'bold' }}>{currentPage} / {pages.length}</div>
          <button className="p-btn" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>⬆️ Arriba</button>
          <button className="p-btn" onClick={() => window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'})}>⬇️ Abajo</button>
          <button className="p-btn" onClick={() => setZoom(z => z * 1.1)}>🔍 +</button>
          <button className="p-btn" onClick={() => setZoom(z => z * 0.9)}>🔍 -</button>
          <button className="p-btn" onClick={() => setMode(mode === 'fit' ? 'normal' : 'fit')}>📐 Fit</button>
          <button className="p-btn" onClick={() => setMode(mode === 'double' ? 'normal' : 'double')}>📖 Doble</button>
          <button className="p-btn" onClick={() => setShowUI(false)}>👁️ Ocultar</button>
          <button className="p-btn" onClick={onBack}>⬅️ Volver</button>
        </div>
      ) : (
        <button onClick={() => setShowUI(true)} style={{ position: 'fixed', right: '15px', top: '15px', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--pastel-blue)', color: 'white', padding: '12px', borderRadius: '50%', cursor: 'pointer', zIndex: 10001 }}>👁️</button>
      )}

      <div className={mode === 'double' ? 'double-mode' : (mode === 'fit' ? 'fit-mode' : '')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {pages.map((url, idx) => (
          <img 
            key={idx} 
            data-idx={idx}
            className="page" 
            src={url} 
            loading={idx > 2 ? "lazy" : "eager"} 
            decoding="async"
            style={pageStyle}
            alt={`Pagina ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Reader;