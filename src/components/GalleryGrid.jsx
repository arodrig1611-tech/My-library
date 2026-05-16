import React from 'react';
import Card from './Card';

const GalleryGrid = ({ items, onItemClick, selectedItems }) => {
  return (
    <div className="grid">
      {items.map((item, index) => {
        // Le damos una "llave" única a cada tarjeta para que React no la haga parpadear
        const uniqueKey = item.r || item.key || item.url || item.g || index;
        const isSelected = selectedItems.has(item.r); 
        
        return (
          <Card 
            key={uniqueKey}
            item={item} 
            onClick={onItemClick}
            isSelected={isSelected}
          />
        );
      })}
    </div>
  );
};

export default GalleryGrid;