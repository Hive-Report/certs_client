import React, { useState } from 'react';

export default function SearchCerts() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedCell, setCopiedCell] = useState(null);

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

  return (
    <div className="p-6 max-w-3xl mx-auto">
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">Серійний номер</th>
                <th className="border p-2 text-left">Назва</th>
                <th className="border p-2 text-left">Дата початку</th>
                <th className="border p-2 text-left">Дата закінчення</th>
                <th className="border p-2 text-left">Тип</th>
                <th className="border p-2 text-left">Тип зберігання</th>
                <th className="border p-2 text-left">Криптографія</th>
                <th className="border p-2 text-left">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.map((cert, index) => (
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
      )}
    </div>
  );
}
