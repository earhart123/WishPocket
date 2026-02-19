import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { WishList, WishItem } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Plus, Link as LinkIcon, Share2, Loader2, ArrowLeft, Save } from 'lucide-react';

export const Editor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<WishList | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.getList(id)
        .then(setList)
        .catch(() => {
          alert('리스트를 찾을 수 없습니다.');
          navigate('/');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  const handleAddItem = async () => {
    if (!urlInput) return;
    // Simple URL validation
    if (!urlInput.startsWith('http')) {
        alert('올바른 URL을 입력해주세요.');
        return;
    }

    setIsScraping(true);
    try {
      const scraped = await api.scrapeUrl(urlInput);
      const newItem: WishItem = {
        ...scraped,
        id: crypto.randomUUID(),
        comment: comment || undefined,
      };

      const updatedList = {
        ...list!,
        items: [newItem, ...(list?.items || [])]
      };

      // Optimistic update
      setList(updatedList);
      await api.updateList(id!, { items: updatedList.items });
      
      // Reset form
      setUrlInput('');
      setComment('');
    } catch (e: any) {
      alert('상품 정보를 가져오지 못했습니다. 링크를 확인해주세요.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!list || !confirm('이 상품을 삭제할까요?')) return;
    const newItems = list.items.filter(i => i.id !== itemId);
    setList({ ...list, items: newItems });
    await api.updateList(id!, { items: newItems });
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/#/view/${id}`;
    if (navigator.share) {
      navigator.share({
        title: `${list?.owner}님의 위시리스트`,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다!');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-kakao" /></div>;
  if (!list) return null;

  return (
    <div className="flex flex-col h-screen bg-bgGray">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-800">{list.owner}님의 위시포켓</h1>
        <button onClick={handleShare} className="text-slate-900 bg-kakao p-2 rounded-full">
          <Share2 size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-32">
        <div className="mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Plus size={16} className="text-kakaoDark" />
              상품 추가하기
            </h2>
            <div className="space-y-3">
              <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-transparent focus-within:border-kakao transition-colors">
                <LinkIcon size={16} className="text-gray-400 mr-2" />
                <input 
                  type="url" 
                  placeholder="네이버, 무신사, 오늘의집 링크 붙여넣기" 
                  className="bg-transparent w-full outline-none text-sm"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isScraping}
                />
              </div>
              <input 
                type="text" 
                placeholder="갖고 싶은 이유나 옵션 (선택)" 
                className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus-within:border-kakao transition-colors"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isScraping}
              />
              <button 
                onClick={handleAddItem}
                disabled={!urlInput || isScraping}
                className="w-full bg-slate-900 text-white py-3 rounded-lg text-sm font-bold active:scale-[0.98] transition-transform flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isScraping ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isScraping ? '상품 정보 가져오는 중...' : '리스트에 담기'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 ml-1 mb-2">담은 상품 ({list.items.length})</h3>
          {list.items.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              아직 담은 상품이 없어요.<br />
              위의 입력창에 링크를 넣어보세요!
            </div>
          ) : (
            list.items.map(item => (
              <ItemCard 
                key={item.id} 
                item={item} 
                isEditable={true} 
                onDelete={handleDeleteItem}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};