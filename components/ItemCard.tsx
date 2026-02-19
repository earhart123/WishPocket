import React from 'react';
import { WishItem } from '../types';
import { ExternalLink, Trash2, Edit2 } from 'lucide-react';

interface ItemCardProps {
  item: WishItem;
  isEditable?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (item: WishItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, isEditable, onDelete, onEdit }) => {
  const formatPrice = (price: string) => {
    // Basic number formatting if the scraper returns raw numbers
    if (!isNaN(Number(price))) {
      return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Number(price));
    }
    return price;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-3 flex gap-3 hover:shadow-md transition-shadow">
      <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative">
        {item.image ? (
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex justify-between items-start gap-1">
            <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
              {item.title}
            </h3>
            {isEditable && (
              <button 
                onClick={() => onDelete && onDelete(item.id)} 
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1">{item.siteName}</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{formatPrice(item.price)}</p>
        </div>

        <div className="flex justify-between items-end mt-2">
          {item.comment && (
            <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded line-clamp-1 flex-1 mr-2">
              "{item.comment}"
            </p>
          )}
          
          <div className="flex gap-2">
            {isEditable && onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600"
              >
                <Edit2 size={16} />
              </button>
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 rounded-full text-sm font-medium flex items-center gap-1 transition-colors ${
                isEditable 
                  ? 'text-blue-600 hover:bg-blue-50' 
                  : 'bg-kakao text-slate-900 hover:bg-kakaoDark shadow-sm px-4'
              }`}
            >
              {isEditable ? <ExternalLink size={16} /> : <span className="text-xs font-bold">선물하기</span>}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};