import React, { useRef, useState, useEffect } from 'react';
import { BoardItemData, ItemType } from '../types';
import { Trash2, GripHorizontal, Maximize2 } from 'lucide-react';

interface DraggableItemProps {
  item: BoardItemData;
  onUpdate: (id: string, updates: Partial<BoardItemData>) => void;
  onDelete: (id: string) => void;
  onBringToFront: (id: string) => void;
  scale: number;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  onUpdate,
  onDelete,
  onBringToFront,
  scale,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag if clicking the handle or the item body (but not specific interactive elements if we had them)
    // For now, whole item is draggable unless it's a specific control
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    
    e.preventDefault();
    e.stopPropagation();
    onBringToFront(item.id);
    
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      // Calculate offset from top-left of the item
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !nodeRef.current) return;
    e.preventDefault();

    const parentRect = nodeRef.current.offsetParent?.getBoundingClientRect();
    if (!parentRect) return;

    // Calculate new position relative to parent
    // We adjust for scale if the parent is scaled, but here we assume 1:1 for simplicity or apply scale factor
    // If the board is zoomed, we might need to divide delta by scale. 
    // Simplified: we calculate exact position based on mouse - parent offset - drag offset
    
    const newX = (e.clientX - parentRect.left - dragOffset.x) / scale;
    const newY = (e.clientY - parentRect.top - dragOffset.y) / scale;

    onUpdate(item.id, {
      position: { x: newX, y: newY },
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const getRotationStyle = () => ({
    transform: `rotate(${item.meta?.rotation || 0}deg)`,
  });

  return (
    <div
      ref={nodeRef}
      className={`absolute group cursor-move select-none transition-shadow duration-200 ${isDragging ? 'z-[9999] shadow-2xl scale-[1.02]' : ''}`}
      style={{
        left: item.position.x,
        top: item.position.y,
        zIndex: item.zIndex,
        ...getRotationStyle(),
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Content Renderer */}
      <div className="relative">
        
        {/* Hover Controls */}
        <div className="absolute -top-8 left-0 right-0 hidden group-hover:flex justify-between items-center px-2 py-1 bg-black/50 rounded-full backdrop-blur-md text-white no-drag opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="p-1 hover:text-red-300 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <GripHorizontal size={14} className="text-white/50" />
           <div 
             className="p-1 cursor-ew-resize hover:text-blue-300"
             onPointerDown={(e) => {
               // Rotation logic could go here, simplified for now to just be a visual handle or drag handle
               e.stopPropagation();
             }}
           >
             {/* Placeholder for future rotation/resize */}
           </div>
        </div>

        {/* Item Content */}
        {item.type === ItemType.IMAGE && (
          <div className="p-2 bg-white rounded-lg shadow-lg rotate-1 overflow-hidden max-w-[300px] sm:max-w-[400px]">
             {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={item.content} 
              alt="Vision" 
              className="w-full h-auto object-cover rounded pointer-events-none" 
              draggable={false}
            />
            {item.meta?.title && (
              <p className="mt-2 text-center font-serif italic text-gray-600 text-sm">
                {item.meta.title}
              </p>
            )}
          </div>
        )}

        {item.type === ItemType.QUOTE && (
          <div className={`p-6 rounded-lg shadow-lg max-w-sm backdrop-blur-sm ${item.meta?.color || 'bg-white/80'}`}>
            <p className="font-serif text-2xl text-center text-gray-800 leading-relaxed italic">
              "{item.content}"
            </p>
          </div>
        )}

        {item.type === ItemType.NOTE && (
          <div className={`p-4 rounded shadow-md w-48 ${item.meta?.color || 'bg-yellow-100'} -rotate-1`}>
            <div className="w-2 h-2 rounded-full bg-black/10 mx-auto mb-2" />
            <p className="font-handwriting text-gray-800 text-sm whitespace-pre-wrap">
              {item.content}
            </p>
          </div>
        )}

        {item.type === ItemType.GOAL_LIST && (
           <div className="p-4 bg-white rounded-xl shadow-lg w-64 border-t-4 border-indigo-500">
             <h3 className="font-bold text-gray-800 border-b pb-2 mb-2 uppercase text-xs tracking-wider">
               {item.meta?.title || 'Goals'}
             </h3>
             <ul className="space-y-2">
               {item.meta?.items?.map((goal, idx) => (
                 <li key={idx} className="flex items-start text-sm text-gray-700">
                   <span className="mr-2 mt-1 block w-3 h-3 border rounded-full border-gray-400 shrink-0" />
                   <span>{goal}</span>
                 </li>
               ))}
             </ul>
           </div>
        )}

      </div>
    </div>
  );
};
