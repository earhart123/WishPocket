import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Calendar, User, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState(''); // Optional, for edit access
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !birthday) return alert('닉네임과 생일을 입력해주세요.');
    
    setLoading(true);
    try {
      const list = await api.createList({ owner: name, birthday, password });
      // Navigate to editor mode initially
      navigate(`/edit/${list.id}`);
    } catch (e: any) {
      alert(e.message || '리스트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
        <div className="w-20 h-20 bg-kakao rounded-3xl flex items-center justify-center shadow-lg transform rotate-3">
          <Gift size={40} className="text-slate-900" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">WishPocket</h1>
          <p className="text-gray-500 text-sm">
            친구들에게 받고 싶은 선물을<br />
            쉽고 예쁘게 공유해보세요.
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">닉네임</label>
            <div className="flex items-center bg-gray-50 rounded-lg px-3 py-3">
              <User size={18} className="text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="어떻게 불러드릴까요?" 
                className="bg-transparent w-full outline-none text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">생일 (선택사항)</label>
            <div className="flex items-center bg-gray-50 rounded-lg px-3 py-3">
              <Calendar size={18} className="text-gray-400 mr-2" />
              <input 
                type="date" 
                className="bg-transparent w-full outline-none text-sm text-gray-600"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-400 ml-1">
              * 생일로부터 7일 후 리스트가 자동으로 만료됩니다.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 ml-1">비밀번호 (수정용)</label>
            <div className="flex items-center bg-gray-50 rounded-lg px-3 py-3">
              <input 
                type="password" 
                placeholder="간단한 비밀번호 (선택)" 
                className="bg-transparent w-full outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-kakao text-slate-900 font-bold py-4 rounded-xl shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : '위시리스트 만들기'}
          {!loading && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
};