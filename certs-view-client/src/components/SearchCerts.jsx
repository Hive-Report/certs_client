import React, { useState } from 'react';

export default function SearchCerts() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCell, setCopiedCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    name: '',
    type: '',
    status: '',
    storage_type: '',
    crypt: '',
    start_date_from: '',
    start_date_to: '',
    end_date_from: '',
    end_date_to: ''
  });
  const [columnSettings, setColumnSettings] = useState({
    serial: { visible: true, width: 200 },
    name: { visible: true, width: 250 },
    start_date: { visible: true, width: 150 },
    end_date: { visible: true, width: 150 },
    type: { visible: true, width: 120 },
    storage_type: { visible: true, width: 150 },
    crypt: { visible: true, width: 120 },
    status: { visible: true, width: 100 }
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/certs/${search}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Помилка:', error);
      setData([]);
      // Можна додати toast notification або інше повідомлення про помилку
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, cellId) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 1000);
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      type: '',
      status: '',
      storage_type: '',
      crypt: '',
      start_date_from: '',
      start_date_to: '',
      end_date_from: '',
      end_date_to: ''
    });
  };

  const toggleColumnVisibility = (columnKey) => {
    setColumnSettings(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        visible: !prev[columnKey].visible
      }
    }));
  };

  const updateColumnWidth = (columnKey, width) => {
    setColumnSettings(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        width: Math.max(50, width) // Мінімальна ширина 50px
      }
    }));
  };

  const resetColumnSettings = () => {
    setColumnSettings({
      serial: { visible: true, width: 200 },
      name: { visible: true, width: 250 },
      start_date: { visible: true, width: 150 },
      end_date: { visible: true, width: 150 },
      type: { visible: true, width: 120 },
      storage_type: { visible: true, width: 150 },
      crypt: { visible: true, width: 120 },
      status: { visible: true, width: 100 }
    });
  };

  const columns = [
    { key: 'serial', label: 'Серійний номер', filterable: false },
    { key: 'name', label: 'Назва', filterable: true },
    { key: 'start_date', label: 'Дата початку', filterable: true, type: 'date' },
    { key: 'end_date', label: 'Дата закінчення', filterable: true, type: 'date' },
    { key: 'type', label: 'Тип', filterable: true },
    { key: 'storage_type', label: 'Тип зберігання', filterable: true },
    { key: 'crypt', label: 'Криптографія', filterable: true },
    { key: 'status', label: 'Статус', filterable: true }
  ];

  const filteredAndSortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let filtered = data.filter(cert => {
      // Текстові фільтри
      const textFilters = (
        (cert.name || '').toLowerCase().includes(filters.name.toLowerCase()) &&
        (cert.type || '').toLowerCase().includes(filters.type.toLowerCase()) &&
        (cert.status || '').toLowerCase().includes(filters.status.toLowerCase()) &&
        (cert.storage_type || '').toLowerCase().includes(filters.storage_type.toLowerCase()) &&
        (cert.crypt || '').toLowerCase().includes(filters.crypt.toLowerCase())
      );
      
      if (!textFilters) return false;
      
      // Фільтри за датами
      const startDate = cert.start_date ? new Date(cert.start_date) : null;
      const endDate = cert.end_date ? new Date(cert.end_date) : null;
      
      // Фільтр "Дата початку від"
      if (filters.start_date_from && startDate) {
        const fromDate = new Date(filters.start_date_from);
        if (startDate < fromDate) return false;
      }
      
      // Фільтр "Дата початку до"
      if (filters.start_date_to && startDate) {
        const toDate = new Date(filters.start_date_to);
        if (startDate > toDate) return false;
      }
      
      // Фільтр "Дата закінчення від"
      if (filters.end_date_from && endDate) {
        const fromDate = new Date(filters.end_date_from);
        if (endDate < fromDate) return false;
      }
      
      // Фільтр "Дата закінчення до"
      if (filters.end_date_to && endDate) {
        const toDate = new Date(filters.end_date_to);
        if (endDate > toDate) return false;
      }
      
      return true;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';
        
        if (sortConfig.key === 'start_date' || sortConfig.key === 'end_date') {
          aValue = aValue ? new Date(aValue) : new Date(0);
          bValue = bValue ? new Date(bValue) : new Date(0);
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, filters, sortConfig]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Введіть ЄДРПОУ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Шукати
        </button>
      </div>

      {loading && <div className="text-center py-4">Завантаження...</div>}

      {!loading && data.length === 0 && search.trim() && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg mb-2">Результатів не знайдено</div>
          <div className="text-gray-400 text-sm">
            Спробуйте змінити ЄДРПОУ або перевірте правильність введення
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="space-y-4">
          {/* Налаштування стовпців */}
          <div className="bg-gray-50 p-4 rounded">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Налаштування таблиці</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded"
                >
                  {showColumnSettings ? 'Приховати' : 'Налаштувати стовпці'}
                </button>
                <button
                  onClick={resetColumnSettings}
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Скинути
                </button>
              </div>
            </div>
            
            {showColumnSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {columns.map(column => (
                  <div key={column.key} className="bg-white p-3 rounded border">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={columnSettings[column.key].visible}
                        onChange={() => toggleColumnVisibility(column.key)}
                        className="rounded"
                      />
                      <label className="text-sm font-medium">{column.label}</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Ширина:</label>
                      <input
                        type="range"
                        min="50"
                        max="400"
                        value={columnSettings[column.key].width}
                        onChange={(e) => updateColumnWidth(column.key, parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500 w-10">{columnSettings[column.key].width}px</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Фільтри */}
          <div className="bg-gray-50 p-4 rounded">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Фільтри</h3>
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                Очистити
              </button>
            </div>
            
            {/* Текстові фільтри */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 text-gray-700">Текстові фільтри</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {columns.filter(col => col.filterable && col.type !== 'date').map(column => (
                  <div key={column.key}>
                    {column.key === 'status' ? (
                      <select
                        value={filters[column.key]}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="">Всі статуси</option>
                        <option value="active">Активний</option>
                        <option value="expired">Прострочений</option>
                        <option value="pending">Очікування</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={`Фільтр за ${column.label.toLowerCase()}...`}
                        value={filters[column.key]}
                        onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        className="w-full p-2 border rounded text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Фільтри за датами */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-700">Фільтри за датами</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Дата початку від:</label>
                  <input
                    type="date"
                    value={filters.start_date_from}
                    onChange={(e) => handleFilterChange('start_date_from', e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Дата початку до:</label>
                  <input
                    type="date"
                    value={filters.start_date_to}
                    onChange={(e) => handleFilterChange('start_date_to', e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Дата закінчення від:</label>
                  <input
                    type="date"
                    value={filters.end_date_from}
                    onChange={(e) => handleFilterChange('end_date_from', e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Дата закінчення до:</label>
                  <input
                    type="date"
                    value={filters.end_date_to}
                    onChange={(e) => handleFilterChange('end_date_to', e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              </div>
              
              {/* Швидкі фільтри */}
              <div className="mt-3">
                <h5 className="text-xs font-medium mb-2 text-gray-600">Швидкі фільтри:</h5>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setFilters(prev => ({ ...prev, end_date_from: today }));
                    }}
                    className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Активні сьогодні
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setFilters(prev => ({ ...prev, end_date_to: today }));
                    }}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Прострочені
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                      setFilters(prev => ({ 
                        ...prev, 
                        end_date_from: today.toISOString().split('T')[0],
                        end_date_to: nextMonth.toISOString().split('T')[0]
                      }));
                    }}
                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                  >
                    Закінчуються в місяць
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Таблиця */}
          <div className="text-sm text-gray-600 mb-2">
            Знайдено сертифікатів: {filteredAndSortedData.length} з {data.length}
          </div>
          
          {filteredAndSortedData.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded">
              <div className="text-gray-500 text-lg mb-2">Немає сертифікатів за вашими фільтрами</div>
              <div className="text-gray-400 text-sm mb-4">
                Спробуйте змінити або очистити фільтри для отримання результатів
              </div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Очистити фільтри
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {columns.filter(col => columnSettings[col.key].visible).map(column => (
                      <th 
                        key={column.key}
                        className="border p-2 text-left cursor-pointer hover:bg-gray-100 resize-x"
                        onClick={() => handleSort(column.key)}
                        style={{ 
                          width: `${columnSettings[column.key].width}px`,
                          minWidth: `${columnSettings[column.key].width}px`,
                          maxWidth: `${columnSettings[column.key].width}px`
                        }}
                      >
                        {column.label}
                        {sortConfig.key === column.key && (
                          <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.map((cert, index) => (
                    <tr key={cert.serial || index}>
                      {columns.filter(col => columnSettings[col.key].visible).map(column => (
                        <td
                          key={column.key}
                          className={`border p-2 cursor-pointer ${
                            copiedCell === `${column.key}-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => copyToClipboard(cert[column.key] || '', `${column.key}-${index}`)}
                          style={{ 
                            width: `${columnSettings[column.key].width}px`,
                            minWidth: `${columnSettings[column.key].width}px`,
                            maxWidth: `${columnSettings[column.key].width}px`,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={`${cert[column.key] || ''} - Клікніть для копіювання`}
                        >
                          {column.key === 'status' ? (
                            <span className={`px-2 py-1 rounded text-xs ${
                              cert.status === 'active' ? 'bg-green-100 text-green-800' : 
                              cert.status === 'expired' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {cert.status || 'Невідомо'}
                            </span>
                          ) : (
                            cert[column.key] || '-'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
