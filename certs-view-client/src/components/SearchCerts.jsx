import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService.js';

export default function SearchCerts() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    serial: { visible: true, width: 350 },
    name: { visible: true, width: 250 },
    start_date: { visible: true, width: 150 },
    end_date: { visible: true, width: 150 },
    type: { visible: true, width: 120 },
    storage_type: { visible: true, width: 150 },
    crypt: { visible: true, width: 120 },
    status: { visible: true, width: 100 }
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltersActive, setIsFiltersActive] = useState(false);

  // Завантаження налаштувань з localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('searchCerts_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.columnSettings) setColumnSettings(parsed.columnSettings);
        if (parsed.sortConfig) setSortConfig(parsed.sortConfig);
        if (parsed.showFilters !== undefined) setShowFilters(parsed.showFilters);
      } catch (e) {
        console.error('Помилка завантаження налаштувань:', e);
      }
    }
  }, []);

  // Збереження налаштувань в localStorage
  useEffect(() => {
    const settings = {
      columnSettings,
      sortConfig,
      showFilters
    };
    localStorage.setItem('searchCerts_settings', JSON.stringify(settings));
  }, [columnSettings, sortConfig, showFilters]);

  // Перевірка активності фільтрів
  useEffect(() => {
    const hasActiveFilters = Object.values(filters).some(value => value !== '');
    setIsFiltersActive(hasActiveFilters);
  }, [filters]);

  const handleSearch = async () => {
    if (!search.trim()) {
      setError('Будь ласка, введіть ЄДРПОУ');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await apiService.searchCerts(search);
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Помилка:', error);
      if (error.message.includes('401')) {
        setError('Сесія закінчилась. Будь ласка, авторизуйтесь знову.');
      } else {
        setError(error.message || 'Помилка при завантаженні даних');
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyToClipboard = useCallback((text, cellId) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 2000);
    }).catch(err => {
      console.error('Помилка копіювання:', err);
    });
  }, []);

  const handleSort = (key) => {
    setSortConfig(prev => {
      let direction = 'asc';
      if (prev.key === key && prev.direction === 'asc') {
        direction = 'desc';
      }
      return { key, direction };
    });
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
        width: Math.max(80, Math.min(500, width))
      }
    }));
  };

  const resetColumnSettings = () => {
    setColumnSettings({
      serial: { visible: true, width: 350 },
      name: { visible: true, width: 250 },
      start_date: { visible: true, width: 150 },
      end_date: { visible: true, width: 150 },
      type: { visible: true, width: 120 },
      storage_type: { visible: true, width: 150 },
      crypt: { visible: true, width: 120 },
      status: { visible: true, width: 100 }
    });
  };

  const setQuickFilter = (type) => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (type) {
      case 'Діючий':
        setFilters(prev => ({ 
          ...prev, 
          end_date_from: today,
          end_date_to: '',
          status: 'Діючий'
        }));
        break;
      case 'Заблокований':
        setFilters(prev => ({ 
          ...prev, 
          end_date_to: today,
          end_date_from: '',
          status: 'Заблокований'
        }));
        break;
      case 'Скасований':
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setFilters(prev => ({ 
          ...prev, 
          end_date_from: today,
          end_date_to: nextMonth.toISOString().split('T')[0],
          status: 'Скасований'
        }));
        break;
      default:
        break;
    }
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
      const textFilters = (
        (cert.name || '').toLowerCase().includes(filters.name.toLowerCase()) &&
        (cert.type || '').toLowerCase().includes(filters.type.toLowerCase()) &&
        (cert.status || '').toLowerCase().includes(filters.status.toLowerCase()) &&
        (cert.storage_type || '').toLowerCase().includes(filters.storage_type.toLowerCase()) &&
        (cert.crypt || '').toLowerCase().includes(filters.crypt.toLowerCase())
      );
      
      if (!textFilters) return false;
      
      const startDate = cert.start_date ? new Date(cert.start_date) : null;
      const endDate = cert.end_date ? new Date(cert.end_date) : null;
      
      if (filters.start_date_from && startDate) {
        const fromDate = new Date(filters.start_date_from);
        if (startDate < fromDate) return false;
      }
      
      if (filters.start_date_to && startDate) {
        const toDate = new Date(filters.start_date_to);
        if (startDate > toDate) return false;
      }
      
      if (filters.end_date_from && endDate) {
        const fromDate = new Date(filters.end_date_from);
        if (endDate < fromDate) return false;
      }
      
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Діючий': return 'bg-green-100 text-green-800 border-green-200';
      case 'Заблокований': return 'bg-red-100 text-red-800 border-red-200';
      case 'Скасований': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Діючий': return 'Діючий';
      case 'Заблокований': return 'Заблокований';
      case 'Скасований': return 'Скасований';
      default: return 'Невідомо';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('uk-UA');
    } catch {
      return dateStr;
    }
  };

  // Функція для відображення серійного номера як є
  const formatSerial = (serial) => {
    if (!serial) return '-';
    return serial.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-semibold m-4">Пошук сертифікатів</h1>
        {/* Пошук */}
        <div className="m-4">
          <div className="card-body">
            <div className="input-group w-100" style={{maxWidth: 300}}>
              <input
                type="text"
                placeholder="Введіть ЄДРПОУ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyPress}
                aria-label="Введіть ЄДРПОУ"
                className="form-control w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn btn-primary"
                type="button"
                style={{ backgroundColor: '#31c48d', color: '#fff', border: 'none' }}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : null}
                {loading ? 'Завантаження...' : 'Шукати'}
              </button>
            </div>
            {error && (
              <div className="alert alert-danger mt-3" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Результати пошуку */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Завантаження...</p>
          </div>
        )}

        {!loading && data.length === 0 && search.trim() && !error && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="text-gray-400 mb-4" style={{ fontSize: '4rem' }}>🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Результатів не знайдено</h3>
            <p className="text-gray-600">
              Спробуйте змінити ЄДРПОУ або перевірте правильність введення
            </p>
          </div>
        )}

        {data.length > 0 && (
          <div className="space-y-6">
            {/* Панель управління */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Знайдено: {filteredAndSortedData.length} з {data.length}
                  </h2>
                  {isFiltersActive && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      Фільтри активні
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showFilters 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showFilters ? 'Приховати фільтри' : 'Показати фільтри'}
                  </button>
                  
                  <button
                    onClick={() => setShowColumnSettings(!showColumnSettings)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showColumnSettings 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Налаштування стовпців
                  </button>
                </div>
              </div>

              {/* Налаштування стовпців */}
              {showColumnSettings && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Налаштування стовпців</h3>
                    <button
                      onClick={resetColumnSettings}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg"
                    >
                      Скинути до стандартних
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {columns.map(column => (
                      <div key={column.key} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={columnSettings[column.key].visible}
                            onChange={() => toggleColumnVisibility(column.key)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label className="text-sm font-medium text-gray-900">
                            {column.label}
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 w-12">Ширина:</label>
                          <input
                            type="range"
                            min="80"
                            max="500"
                            value={columnSettings[column.key].width}
                            onChange={(e) => updateColumnWidth(column.key, parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-500 w-12 text-right">
                            {columnSettings[column.key].width}px
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Фільтри */}
              {showFilters && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Фільтри</h3>
                    <button
                      onClick={clearFilters}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg"
                    >
                      Очистити всі
                    </button>
                  </div>
                  
                  {/* Швидкі фільтри */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Швидкі фільтри:</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setQuickFilter('Діючий')}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Активні сьогодні
                      </button>
                      <button
                        onClick={() => setQuickFilter('Заблокований')}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Прострочені
                      </button>
                      <button
                        onClick={() => setQuickFilter('Скасований')}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                      >
                        Закінчуються в місяць
                      </button>
                    </div>
                  </div>
                  
                  {/* Текстові фільтри */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Текстові фільтри:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {columns.filter(col => col.filterable && col.type !== 'date').map(column => (
                        <div key={column.key}>
                          <label className="block text-xs text-gray-600 mb-1">
                            {column.label}:
                          </label>
                          {column.key === 'status' ? (
                            <select
                              value={filters[column.key]}
                              onChange={(e) => handleFilterChange(column.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Всі статуси</option>
                              <option value="Діючий">Діючий</option>
                              <option value="expired">Прострочений</option>
                              <option value="pending">Очікування</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder={`Фільтр...`}
                              value={filters[column.key]}
                              onChange={(e) => handleFilterChange(column.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Фільтри за датами */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Фільтри за датами:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Дата початку від:</label>
                        <input
                          type="date"
                          value={filters.start_date_from}
                          onChange={(e) => handleFilterChange('start_date_from', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Дата початку до:</label>
                        <input
                          type="date"
                          value={filters.start_date_to}
                          onChange={(e) => handleFilterChange('start_date_to', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Дата закінчення від:</label>
                        <input
                          type="date"
                          value={filters.end_date_from}
                          onChange={(e) => handleFilterChange('end_date_from', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Дата закінчення до:</label>
                        <input
                          type="date"
                          value={filters.end_date_to}
                          onChange={(e) => handleFilterChange('end_date_to', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Таблиця */}
            {filteredAndSortedData.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <div className="text-gray-400 mb-4" style={{ fontSize: '4rem' }}>🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Немає сертифікатів за вашими фільтрами
                </h3>
                <p className="text-gray-600 mb-6">
                  Спробуйте змінити або очистити фільтри для отримання результатів
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Очистити фільтри
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {columns.filter(col => columnSettings[col.key].visible).map(column => (
                          <th 
                            key={column.key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort(column.key)}
                            style={{ 
                              width: `${columnSettings[column.key].width}px`,
                              minWidth: `${columnSettings[column.key].width}px`,
                              maxWidth: `${columnSettings[column.key].width}px`
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {column.label}
                              {sortConfig.key === column.key && (
                                <span className="text-blue-600">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedData.map((cert, index) => (
                        <tr key={cert.serial || index} className="hover:bg-gray-50 transition-colors">
                          {columns.filter(col => columnSettings[col.key].visible).map(column => (
                            <td
                              key={column.key}
                              className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                                copiedCell === `${column.key}-${index}` 
                                  ? 'bg-green-100 text-green-900' 
                                  : 'text-gray-900 hover:bg-blue-50'
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
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(cert.status)}`}>
                                  {getStatusText(cert.status)}
                                </span>
                              ) : column.key === 'serial' ? (
                                formatSerial(cert.serial)
                              ) : column.key === 'start_date' || column.key === 'end_date' ? (
                                formatDate(cert[column.key])
                              ) : (
                                cert[column.key] || '-'
                              )}
                              
                              {copiedCell === `${column.key}-${index}` && (
                                <span className="ml-2 text-green-600">✓</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
