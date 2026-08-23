import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const emptyFilters = {
  medicineName: '',
  brand: '',
  category: '',
};

const STATUS_STYLES = {
  'In Stock': 'bg-emerald-100 text-emerald-700',
  'Low Stock': 'bg-amber-100 text-amber-700',
  'Out of Stock': 'bg-gray-200 text-gray-700',
  'Expiring Soon': 'bg-orange-100 text-orange-700',
  Expired: 'bg-red-100 text-red-700',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
}

function MedicineSearchPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [nameOptions, setNameOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Populates the Name/Brand/Category dropdowns from what's actually in pharmacy
  // inventory, so patients pick from real values instead of guessing free text.
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { data } = await apiClient.get('/pharmacy-medicines');
        const allMedicines = Array.isArray(data.medicines) ? data.medicines : [];
        const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort();
        setNameOptions(uniqueSorted(allMedicines.map((m) => m.medicineName)));
        setBrandOptions(uniqueSorted(allMedicines.map((m) => m.brand)));
        setCategoryOptions(uniqueSorted(allMedicines.map((m) => m.category)));
      } catch {
        // Non-fatal: dropdowns just stay empty ("All"); search itself still works.
      }
    };
    loadFilterOptions();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    const params = {};
    if (filters.medicineName.trim()) params.medicineName = filters.medicineName.trim();
    if (filters.brand.trim()) params.brand = filters.brand.trim();
    if (filters.category.trim()) params.category = filters.category.trim();

    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/pharmacy-medicines/search', { params });
      setMedicines(Array.isArray(data.medicines) ? data.medicines : []);
      setHasSearched(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Medicine search failed. Please try again.');
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilters(emptyFilters);
    setMedicines([]);
    setHasSearched(false);
    setError('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Medicine Search</h1>
        <p className="mt-2 text-sm text-gray-500">
          Choose a medicine name, brand, or category to see live availability and pricing
          across pharmacies.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
            <select
              name="medicineName"
              value={filters.medicineName}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">All Medicines</option>
              {nameOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select
              name="brand"
              value={filters.brand}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">All Brands</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="submit"
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Results</h2>
          {hasSearched && !loading && (
            <span className="text-sm text-gray-500">
              {medicines.length} medicine{medicines.length === 1 ? '' : 's'} found
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Searching medicines...</p>
        ) : !hasSearched ? (
          <p className="text-gray-500">
            Enter a medicine name, brand, or category above and click Search to check availability.
          </p>
        ) : medicines.length === 0 ? (
          <p className="text-gray-500">No medicines matched your search. Try a different name, brand, or category.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Medicine</th>
                  <th className="py-3 pr-4">Brand</th>
                  <th className="py-3 pr-4">Pharmacy</th>
                  <th className="py-3 pr-4">Price</th>
                  <th className="py-3 pr-4">Expiry</th>
                  <th className="py-3 pr-4">Availability</th>
                  <th className="py-3 pr-4">Prescription</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine._id} className="border-b border-gray-100 align-top">
                    <td className="py-4 pr-4 font-medium text-gray-900">{medicine.medicineName}</td>
                    <td className="py-4 pr-4 text-gray-600">{medicine.brand}</td>
                    <td className="py-4 pr-4 text-gray-600">{medicine.pharmacyName}</td>
                    <td className="py-4 pr-4 text-gray-600">৳{medicine.price}</td>
                    <td className="py-4 pr-4 text-gray-600">{formatDate(medicine.expiryDate)}</td>
                    <td className="py-4 pr-4">
                      <StatusBadge status={medicine.stockStatus} />
                    </td>
                    <td className="py-4 pr-4 text-gray-600">
                      {medicine.prescriptionRequired ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MedicineSearchPage;
