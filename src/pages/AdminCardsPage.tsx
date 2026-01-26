import { useState, useEffect } from 'react';
import { Shield, Save, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  PROFESSIONS,
  HOBBIES,
  BAGGAGE,
  FACTS,
  ACTION_CARDS,
  BIOLOGY_TEMPLATES,
  HEALTH_CONDITIONS_RAW,
} from '@/data/gameData';

interface CardCategory {
  name: string;
  key: string;
  cards: string[];
  description: string;
}

const AdminCardsPage = () => {
  const [categories, setCategories] = useState<CardCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize cards - prioritize Supabase, then localStorage, then defaults
  useEffect(() => {
    const initialCategories: CardCategory[] = [
      { name: 'Профессии', key: 'professions', cards: [...PROFESSIONS], description: 'Профессии персонажей' },
      { name: 'Биология', key: 'biology', cards: [...BIOLOGY_TEMPLATES], description: 'Пол, возраст, ориентация (используйте {age} для случайного возраста)' },
      { name: 'Здоровье', key: 'health', cards: [...HEALTH_CONDITIONS_RAW], description: 'Состояние здоровья (используйте [Тяжесть: %] для случайной тяжести)' },
      { name: 'Хобби', key: 'hobbies', cards: [...HOBBIES], description: 'Увлечения персонажей' },
      { name: 'Багаж', key: 'baggage', cards: [...BAGGAGE], description: 'Предметы в багаже' },
      { name: 'Факты', key: 'facts', cards: [...FACTS], description: 'Особенности и факты о персонаже' },
      { name: 'Карты действий', key: 'actions', cards: [...ACTION_CARDS], description: 'Специальные карты действий' },
    ];
    
    const loadCards = async () => {
      // First try to load from Supabase (source of truth)
      try {
        const { data, error } = await supabase
          .from('game_cards')
          .select('cards_data')
          .eq('id', 'main')
          .single();
        
        if (!error && data?.cards_data && Array.isArray(data.cards_data) && data.cards_data.length > 0) {
          console.log('[AdminCards] Loaded from Supabase');
          setCategories(data.cards_data as CardCategory[]);
          return;
        }
      } catch (e) {
        console.warn('[AdminCards] Failed to load from Supabase:', e);
      }
      
      // Fallback to localStorage
      const savedCards = localStorage.getItem('bunker_admin_cards');
      if (savedCards) {
        try {
          const parsed = JSON.parse(savedCards);
          console.log('[AdminCards] Loaded from localStorage');
          setCategories(parsed);
          return;
        } catch {
          // Ignore parse errors
        }
      }
      
      // Use defaults
      console.log('[AdminCards] Using default cards');
      setCategories(initialCategories);
    };
    
    loadCards();
  }, []);

  const toggleCategory = (key: string) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  const updateCard = (categoryKey: string, index: number, value: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.key === categoryKey) {
        const newCards = [...cat.cards];
        newCards[index] = value;
        return { ...cat, cards: newCards };
      }
      return cat;
    }));
  };

  const addCard = (categoryKey: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.key === categoryKey) {
        return { ...cat, cards: [...cat.cards, 'Новая карта'] };
      }
      return cat;
    }));
  };

  const removeCard = (categoryKey: string, index: number) => {
    setCategories(prev => prev.map(cat => {
      if (cat.key === categoryKey) {
        const newCards = cat.cards.filter((_, i) => i !== index);
        return { ...cat, cards: newCards };
      }
      return cat;
    }));
  };

  const saveCards = async () => {
    setSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      // Save to localStorage as backup
      const dataToSave = JSON.stringify(categories);
      localStorage.setItem('bunker_admin_cards', dataToSave);
      
      // Save to Supabase (primary storage)
      const { error } = await supabase
        .from('game_cards')
        .upsert({ 
          id: 'main', 
          cards_data: categories,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('[AdminCards] Supabase save failed:', error);
        setErrorMessage('Сохранено локально. Ошибка синхронизации: ' + error.message);
        setSaveStatus('error');
      } else {
        console.log('[AdminCards] Saved to Supabase:', categories.map(c => `${c.key}: ${c.cards.length}`));
        setSaveStatus('success');
      }
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (confirm('Вы уверены? Все изменения будут потеряны.')) {
      const initialCategories: CardCategory[] = [
        { name: 'Профессии', key: 'professions', cards: [...PROFESSIONS], description: 'Профессии персонажей' },
        { name: 'Биология', key: 'biology', cards: [...BIOLOGY_TEMPLATES], description: 'Пол, возраст, ориентация' },
        { name: 'Здоровье', key: 'health', cards: [...HEALTH_CONDITIONS_RAW], description: 'Состояние здоровья' },
        { name: 'Хобби', key: 'hobbies', cards: [...HOBBIES], description: 'Увлечения персонажей' },
        { name: 'Багаж', key: 'baggage', cards: [...BAGGAGE], description: 'Предметы в багаже' },
        { name: 'Факты', key: 'facts', cards: [...FACTS], description: 'Особенности и факты' },
        { name: 'Карты действий', key: 'actions', cards: [...ACTION_CARDS], description: 'Специальные карты' },
      ];
      setCategories(initialCategories);
      localStorage.removeItem('bunker_admin_cards');
      
      // Also clear from Supabase
      try {
        await supabase
          .from('game_cards')
          .upsert({ 
            id: 'main', 
            cards_data: [],
            updated_at: new Date().toISOString()
          });
      } catch (e) {
        console.warn('[AdminCards] Failed to clear Supabase:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-black">Редактор карт</h1>
                <p className="text-sm text-gray-500">Администрирование игровых карточек</p>
              </div>
            </div>
            <div className="ml-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700">
                ✓ Карты синхронизируются через сервер. Изменения применятся ко всем новым играм.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={resetToDefaults}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Сбросить
              </button>
              <button
                onClick={saveCards}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saveStatus === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : saveStatus === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Сохранение...' : saveStatus === 'success' ? 'Сохранено!' : 'Сохранить'}
              </button>
            </div>
          </div>
          {errorMessage && (
            <div className="mt-2 text-red-600 text-sm">{errorMessage}</div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.key} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-black">{category.name}</span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {category.cards.length} карт
                  </span>
                </div>
                {expandedCategory === category.key ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Expanded content */}
              {expandedCategory === category.key && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <p className="text-sm text-gray-500 mb-4">{category.description}</p>
                  
                  <div className="space-y-2">
                    {category.cards.map((card, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-8 text-right">{index + 1}.</span>
                        <input
                          type="text"
                          value={card}
                          onChange={(e) => updateCard(category.key, index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-black bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => removeCard(category.key, index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить карту"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addCard(category.key)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить карту
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Статистика</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {categories.map((cat) => (
              <div key={cat.key} className="text-gray-600">
                <span className="font-medium text-black">{cat.cards.length}</span> {cat.name.toLowerCase()}
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <span className="font-medium text-black">
              {categories.reduce((acc, cat) => acc + cat.cards.length, 0)}
            </span>
            <span className="text-gray-600"> карт всего</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <h3 className="font-semibold mb-2">Инструкции</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Нажмите на категорию, чтобы развернуть список карт</li>
            <li>Редактируйте текст карты прямо в поле ввода</li>
            <li>Используйте кнопку "+" чтобы добавить новую карту</li>
            <li>Используйте кнопку корзины чтобы удалить карту</li>
            <li>Не забудьте нажать "Сохранить" после изменений</li>
            <li>Для биологии используйте <code className="bg-blue-100 px-1 rounded">{'{age}'}</code> для случайного возраста</li>
            <li>Для здоровья используйте <code className="bg-blue-100 px-1 rounded">[Тяжесть: %]</code> для случайной тяжести</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default AdminCardsPage;
