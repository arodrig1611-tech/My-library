import React, { useState, useEffect } from 'react';

const Card = ({ item, onClick, isSelected }) => {
  const [animeImg, setAnimeImg] = useState(null);

  // Limpiamos los nombres: Cambiamos todos los "_" por espacios en blanco[cite: 15]
  const displayName = item?.nombre ? item.nombre.replace(/_/g, ' ') : '';

  // 🤖 BÚSQUEDA AUTOMÁTICA DE PORTADAS (AniList)[cite: 15]
  useEffect(() => {
    let isMounted = true;

    if (item?.type === 'anime' && displayName) {
      const cachedImg = localStorage.getItem(`anime_cover_${displayName}`);
      if (cachedImg) {
        setAnimeImg(cachedImg);
        return;
      }

      const delay = Math.floor(Math.random() * 2000);
      const timer = setTimeout(async () => {
        try {
          const query = `
            query ($search: String) {
              Media (search: $search, type: ANIME, isAdult: true) {
                coverImage { large }
              }
            }
          `;
          
          const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { search: displayName } })
          });

          if (!res.ok) return; 
          const data = await res.json();
          
          if (isMounted && data?.data?.Media?.coverImage?.large) {
            const imgUrl = data.data.Media.coverImage.large;
            setAnimeImg(imgUrl);
            localStorage.setItem(`anime_cover_${displayName}`, imgUrl);
          }
        } catch (err) {
          console.warn("No se pudo cargar la portada para:", displayName);
        }
      }, delay);

      return () => { isMounted = false; clearTimeout(timer); };
    }
  }, [displayName, item?.type]);

  // --- RENDERIZADO ---[cite: 15]

  if (item?.type === 'back') {
    return (
      <div className="card anime-card" onClick={() => onClick(item)} style={{ minHeight: '60px', borderColor: item?.color }}>
        <span style={{ color: item?.color, fontSize: '14px' }}>{item?.nombre}</span>
      </div>
    );
  }

  if (item?.type === 'anime') {
    return (
      <div className="card" onClick={() => onClick(item)}>
        <img src={animeImg || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="} alt={displayName} loading="lazy" />
        <span>{displayName}</span>
      </div>
    );
  }

  if (item?.type === 'manga' || item?.type === 'manga_cap') {
    return (
      <div className="card" onClick={() => onClick(item)}>
        <img src={item?.portada} alt={displayName} loading="lazy" />
        <span>{displayName}</span>
      </div>
    );
  }

  if (item?.type === 'album') {
    const albumName = item?.g ? item.g.replace(/_/g, ' ') : '';
    return (
      <div className="card" onClick={() => onClick(item)}>
        <div className="badge">{item?.data?.length || 0} imgs</div>
        <img src={item?.thumb} alt={albumName} loading="lazy" />
        <span>{albumName}</span>
      </div>
    );
  }

  if (item?.type === 'real') {
    const realName = item?.p ? item.p.replace(/_/g, ' ') : ''; // Rescatamos el nombre del personaje[cite: 12]
    return (
      <div className={`card ${isSelected ? 'selected' : ''}`} onClick={() => onClick(item)}>
        <img src={item?.thumb} alt="galeria" loading="lazy" />
        <span>{realName}</span> 
      </div>
    );
  }

  return null;
};

export default Card;