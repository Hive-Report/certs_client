import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiService from '../services/apiService.js';

export default function SearchCerts() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || localStorage.getItem('hive_last_edrpou') || '');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCell, setCopiedCell] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: searchParams.get('sort') || null,
    direction: searchParams.get('dir') || 'asc',
  });
  const [filters, setFilters] = useState({
    name:            searchParams.get('name')            || '',
    email:           searchParams.get('email')           || '',
    type:            searchParams.get('type')            || '',
    status:          searchParams.get('status')          || '',
    storage_type:    searchParams.get('storage_type')    || '',
    crypt:           searchParams.get('crypt')           || '',
    start_date_from: searchParams.get('start_date_from') || '',
    start_date_to:   searchParams.get('start_date_to')   || '',
    end_date_from:   searchParams.get('end_date_from')   || '',
    end_date_to:     searchParams.get('end_date_to')     || '',
  });
  const [columnSettings, setColumnSettings] = useState({
    serial:       { visible: true,  width: 350 },
    name:         { visible: true,  width: 250 },
    ipn:          { visible: true,  width: 120 },
    admin_reg:    { visible: true,  width: 220 },
    email:        { visible: true,  width: 200 },
    phone:        { visible: true,  width: 140 },
    address:      { visible: false, width: 280 },
    start_date:   { visible: true,  width: 150 },
    end_date:     { visible: true,  width: 150 },
    type:         { visible: true,  width: 120 },
    storage_type: { visible: true,  width: 150 },
    crypt:        { visible: true,  width: 120 },
    status:       { visible: true,  width: 100 },
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

  // Auto-search on mount if q param present
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearch(q);
      (async () => {
        setLoading(true);
        setError('');
        try {
          const result = await apiService.searchCerts(q);
          setData(Array.isArray(result) ? result : []);
        } catch (err) {
          setError(err.message || 'Помилка при завантаженні даних');
          setData([]);
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters/sort to URL
  useEffect(() => {
    if (!search.trim() && data.length === 0) return;
    const params = {};
    if (search.trim())               params.q    = search.trim();
    if (sortConfig.key)              params.sort = sortConfig.key;
    if (sortConfig.direction !== 'asc') params.dir = sortConfig.direction;
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortConfig]);

  const handleSearch = async () => {
    if (!search.trim()) {
      setError('Будь ласка, введіть ЄДРПОУ');
      return;
    }

    setLoading(true);
    setError('');

    // Push q to URL immediately
    localStorage.setItem('hive_last_edrpou', search.trim());
    setSearchParams({ q: search.trim() }, { replace: true });

    try {
      const result = await apiService.searchCerts(search.trim());
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

  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    }
    return dateStr;
  };

  const copyToClipboard = useCallback((text, cellId, columnKey = null) => {
    if (!text) return;
    let copyText = text;
    if (columnKey === 'start_date' || columnKey === 'end_date') {
      copyText = formatDateDDMMYYYY(copyText);
    }
    navigator.clipboard.writeText(String(copyText)).then(() => {
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
      name:            '',
      email:           '',
      type:            '',
      status:          '',
      storage_type:    '',
      crypt:           '',
      start_date_from: '',
      start_date_to:   '',
      end_date_from:   '',
      end_date_to:     '',
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
      serial:       { visible: true,  width: 350 },
      name:         { visible: true,  width: 250 },
      ipn:          { visible: true,  width: 120 },
      admin_reg:    { visible: true,  width: 220 },
      email:        { visible: true,  width: 200 },
      phone:        { visible: true,  width: 140 },
      address:      { visible: false, width: 280 },
      start_date:   { visible: true,  width: 150 },
      end_date:     { visible: true,  width: 150 },
      type:         { visible: true,  width: 120 },
      storage_type: { visible: true,  width: 150 },
      crypt:        { visible: true,  width: 120 },
      status:       { visible: true,  width: 100 },
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
          status: 'Діючий',
          crypt: 'Підписання'
        }));
        break;
      case 'Заблокований':
        setFilters(prev => ({ 
          ...prev, 
          end_date_to: today,
          end_date_from: '',
          status: 'Заблокований',
          crypt: 'Підписання'
        }));
        break;
      case 'Скасований': {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setFilters(prev => ({ 
          ...prev, 
          end_date_from: today,
          end_date_to: nextMonth.toISOString().split('T')[0],
          status: 'Скасований',
          crypt: 'Підписання'
        }));
        break;
      }
      case 'Підписання':
        setFilters(prev => ({
          ...prev,
          crypt: 'Підписання',
          status: ''
        }));
        break;
      default:
        break;
    }
  };

  const columns = [
    { key: 'serial',       label: 'Серійний номер',   filterable: false },
    { key: 'name',         label: 'Власник',           filterable: true  },
    { key: 'ipn',          label: 'ІПН',               filterable: true  },
    { key: 'admin_reg',    label: 'Адм. реєстрації',   filterable: true  },
    { key: 'email',        label: 'Email',             filterable: true  },
    { key: 'phone',        label: 'Телефон',           filterable: false },
    { key: 'address',      label: 'Адреса',            filterable: false },
    { key: 'start_date',   label: 'Початок дії',       filterable: true, type: 'date' },
    { key: 'end_date',     label: 'Кінець дії',        filterable: true, type: 'date' },
    { key: 'type',         label: 'Тип',               filterable: true  },
    { key: 'storage_type', label: 'Тип зберігання',    filterable: true  },
    { key: 'crypt',        label: 'Криптографія',      filterable: true  },
    { key: 'status',       label: 'Статус',            filterable: true  },
  ];

  const filteredAndSortedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let filtered = data.filter(cert => {
      const textFilters = (
        (cert.name || '').toLowerCase().includes(filters.name.toLowerCase()) &&
        (cert.email || '').toLowerCase().includes(filters.email.toLowerCase()) &&
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
      case 'Діючий': return 'bg-green-200 text-green-900 border-green-300 shadow-sm';
      case 'Заблокований': return 'bg-red-200 text-red-900 border-red-300 shadow-sm';
      case 'Скасований': return 'bg-yellow-200 text-yellow-900 border-yellow-300 shadow-sm';
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
      <div className="max-w-7xl mx-auto py-3 px-2">
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
                style={{ backgroundColor: '#32C48D', color: '#fff', border: 'none' }}
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
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Завантаження...</p>
          </div>
        )}

        {!loading && data.length === 0 && search.trim() && !error && (
          <div className="bg-white rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4" style={{ fontSize: '4rem' }}>🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Результатів не знайдено</h3>
            <p className="text-gray-600">
              Спробуйте змінити ЄДРПОУ або перевірте правильність введення
            </p>
          </div>
        )}

        {data.length > 0 && (
          <div className="space-y-6 m-4">
            {/* Панель управління */}
            <div className="bg-white rounded-lg p-6">
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
                    className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                      showFilters
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showFilters ? 'Приховати фільтри' : 'Показати фільтри'}
                  </button>
                  
                  <button
                    onClick={() => setShowColumnSettings(!showColumnSettings)}
                    className={`px-2 py-1 rounded-lg font-medium transition-colors ${
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
                <div className="border-t pt-2">
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
                      <div key={column.key} className="bg-gray-50 py-3 rounded-lg">
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
                <div className="border-t pt-2">
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
                          ) : column.key === 'crypt' ? (
                            <select
                              value={filters[column.key]}
                              onChange={(e) => handleFilterChange(column.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Всі</option>
                              <option value="Підписання">Підписання</option>
                              <option value="Шифрування">Шифрування</option>
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
              <div className="bg-white rounded-lg p-12 text-center">
                <div className="text-gray-400 mb-4" style={{ fontSize: '4rem' }}>🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Немає сертифікатів за вашими фільтрами
                </h3>
                <p className="text-gray-600 mb-6">
                  Спробуйте змінити або очистити фільтри для отримання результатів
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Очистити фільтри
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border rounded-5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-fixed" style={{ width: '100%' }}>
                    <thead className="border-b" style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        {columns.filter(col => columnSettings[col.key].visible).map(column => (
                          <th 
                            key={column.key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-auto"
                            onClick={() => handleSort(column.key)}
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
                        <React.Fragment key={cert.serial || index}>
                          <tr className="hover:bg-gray-50 transition-colors">
                            {columns.filter(col => columnSettings[col.key].visible).map(column => (
                              <td
                                key={column.key}
                                className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                                  copiedCell === `${column.key}-${index}`
                                    ? 'bg-green-100 text-green-900'
                                    : 'text-gray-900 hover:bg-blue-50'
                                }`}
                                onClick={() => {
                                  const cellValue = column.key === 'address'
                                    ? [cert.address, cert.city].filter(Boolean).join(', ')
                                    : cert[column.key] || '';
                                  copyToClipboard(cellValue, `${column.key}-${index}`, column.key);
                                }}
                                style={{ width: `${columnSettings[column.key].width}px`, minWidth: `${columnSettings[column.key].width}px`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={
                                  column.key === 'address'
                                  ? `${[cert.address, cert.city].filter(Boolean).join(', ') || ''} - Клікніть для копіювання`
                                  : (column.key === 'start_date' || column.key === 'end_date')
                                  ? `${formatDateDDMMYYYY(cert[column.key])} - Клікніть для копіювання`
                                  : `${cert[column.key] || ''} - Клікніть для копіювання`}
                              >
                                {/* TO-DO: Make more flexibility */}
                                {column.key === 'status' ? (
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(cert.status)}`}
                                  style={{ minWidth: 90, justifyContent: 'center', letterSpacing: '0.5px' }}>
                                  {cert.status === 'Діючий' && (
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#34D399"/><path d="M6 10.5L9 13.5L14 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  )}
                                  {cert.status === 'Заблокований' && (
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#F87171"/><path d="M7 7L13 13M13 7L7 13" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                                  )}
                                  {cert.status === 'Скасований' && (
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="10" fill="#FBBF24"/><path d="M10 6V10L12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                                  )}
                                  {getStatusText(cert.status)}
                                </span>
                                ) : column.key === 'serial' ? (
                                  formatSerial(cert.serial)
                                ) : column.key === 'start_date' || column.key === 'end_date' ? (
                                  formatDate(cert[column.key])
                                ) : column.key === 'address' ? (
                                  [cert.address, cert.city].filter(Boolean).join(', ') || '-'
                                ) : (
                                  cert[column.key] || '-'
                                )}
                                {copiedCell === `${column.key}-${index}` && (
                                  <span className="ml-2 text-green-600">✓</span>
                                )}
                              </td>
                            ))}
                          </tr>
                          {/* Horizontal line between rows */}
                          {index < filteredAndSortedData.length - 1 && (
                            <tr>
                              <td colSpan={columns.filter(col => columnSettings[col.key].visible).length} style={{ padding: 0 }}>
                                <div style={{ borderBottom: '2px solid #e5e7eb', margin: 0 }}></div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
