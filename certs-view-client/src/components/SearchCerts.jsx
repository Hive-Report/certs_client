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
    crypt: ''
  });

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/certs/${search}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Помилка:', error);
      setData([]);
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
      crypt: ''
    });
  };

  const filteredAndSortedData = React.useMemo(() => {
    let filtered = data.filter(cert => {
      return (
        cert.name.toLowerCase().includes(filters.name.toLowerCase()) &&
        cert.type.toLowerCase().includes(filters.type.toLowerCase()) &&
        cert.status.toLowerCase().includes(filters.status.toLowerCase()) &&
        cert.storage_type.toLowerCase().includes(filters.storage_type.toLowerCase()) &&
        cert.crypt.toLowerCase().includes(filters.crypt.toLowerCase())
      );
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'start_date' || sortConfig.key === 'end_date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
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

      {loading && <div>Завантаження...</div>}

      {data.length > 0 && (
        <div className="space-y-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <input
                type="text"
                placeholder="Фільтр за назвою..."
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className="p-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Фільтр за типом..."
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="p-2 border rounded text-sm"
              />
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="p-2 border rounded text-sm"
              >
                <option value="">Всі статуси</option>
                <option value="active">Активний</option>
                <option value="expired">Прострочений</option>
                <option value="pending">Очікування</option>
              </select>
              <input
                type="text"
                placeholder="Тип зберігання..."
                value={filters.storage_type}
                onChange={(e) => handleFilterChange('storage_type', e.target.value)}
                className="p-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Криптографія..."
                value={filters.crypt}
                onChange={(e) => handleFilterChange('crypt', e.target.value)}
                className="p-2 border rounded text-sm"
              />
            </div>
          </div>

          {/* Таблиця */}
          <div className="text-sm text-gray-600 mb-2">
            Знайдено сертифікатів: {filteredAndSortedData.length} з {data.length}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('serial')}
                  >
                    Серійний номер
                    {sortConfig.key === 'serial' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Назва
                    {sortConfig.key === 'name' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('start_date')}
                  >
                    Дата початку
                    {sortConfig.key === 'start_date' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('end_date')}
                  >
                    Дата закінчення
                    {sortConfig.key === 'end_date' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}
                  >
                    Тип
                    {sortConfig.key === 'type' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('storage_type')}
                  >
                    Тип зберігання
                    {sortConfig.key === 'storage_type' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('crypt')}
                  >
                    Криптографія
                    {sortConfig.key === 'crypt' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                  <th 
                    className="border p-2 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    Статус
                    {sortConfig.key === 'status' && (
                      <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((cert, index) => (
                  <tr key={cert.serial || index}>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `serial-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.serial, `serial-${index}`)}
                    >
                      {cert.serial}
                    </td>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `name-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.name, `name-${index}`)}
                    >
                      {cert.name}
                    </td>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `start_date-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.start_date, `start_date-${index}`)}
                    >
                      {cert.start_date}
                    </td>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `end_date-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.end_date, `end_date-${index}`)}
                    >
                      {cert.end_date}
                    </td>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `type-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.type, `type-${index}`)}
                    >
                      {cert.type}
                    </td>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `storage_type-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.storage_type, `storage_type-${index}`)}
                    >
                      {cert.storage_type}
                    </td>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `crypt-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.crypt, `crypt-${index}`)}
                    >
                      {cert.crypt}
                    </td>
                    <td
                      className={`border p-2 cursor-pointer ${
                        copiedCell === `status-${index}` ? 'bg-green-200' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => copyToClipboard(cert.status, `status-${index}`)}
                    >
                      <span className={`px-2 py-1 rounded text-xs ${
                        cert.status === 'active' ? 'bg-green-100 text-green-800' : 
                        cert.status === 'expired' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {cert.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
