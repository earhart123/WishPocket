import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { WishList } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Loader2, Gift, Calendar, AlertCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export const Viewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<WishList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api.getList(id)
        .then(setList)
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-kakao" /></div>;
  
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">리스트를 볼 수 없어요</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm">
          나도 위시리스트 만들기
        </button>
      </div>
    );
  }

  if (!list) return null;

  const daysUntilBirthday = () => {
    if (!list.birthday) return null;
    const today = new Date();
    const bday = parseISO(list.birthday);
    // Simple logic: Assume user enters YYYY-MM-DD correctly. 
    // We only care about Month/Day for "D-Day" logic usually, but here we assume the birthday implies the target date.
    // For simplicity, let's just show the date.
    return list.birthday;
  };

  return (
    <div className="flex flex-col min-h-screen bg-bgGray relative">
      {/* Hero Header */}
      <div className="bg-kakao pt-10 pb-16 px-6 rounded-b-[2rem] shadow-sm relative overflow-hidden">
         {/* Decoration Circles */}
         <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white opacity-20 rounded-full" />
         <div className="absolute top-[40px] left-[-10px] w-12 h-12 bg-white opacity-20 rounded-full" />

         <div className="text-center relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-sm">
              <Gift size={32} className="text-slate-900" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              {list.owner}님의 위시리스트
            </h1>
            {list.birthday && (
              <div className="flex items-center justify-center gap-1 text-slate-800 text-sm opacity-80 font-medium">
                <Calendar size={14} />
                <span>{list.birthday}</span>
              </div>
            )}
         </div>
      </div>

      {/* List Content */}
      <div className="flex-1 px-4 -mt-8 pb-10">
        <div className="space-y-2">
          {list.items.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <p className="text-gray-400">아직 등록된 상품이 없어요.</p>
            </div>
          ) : (
            list.items.map(item => (
              <ItemCard key={item.id} item={item} />
            ))
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 text-center">
         <button 
           onClick={() => navigate('/')}
           className="text-xs text-gray-400 underline decoration-gray-300"
         >
           WishPocket으로 내 리스트 만들기
         </button>
      </div>
    </div>
  );
};