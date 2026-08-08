import { useMemo, useState } from 'react';
import SelectedTestsPanel from './SelectedTestsPanel';

function TestSelection({ tests, loading, error, selectedIds, onToggleTest, onContinue }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tests;
    return tests.filter((test) => test.testName.toLowerCase().includes(term));
  }, [tests, searchTerm]);

  const selectedTests = useMemo(
    () => tests.filter((test) => selectedIds.includes(test._id)),
    [tests, selectedIds]
  );

  const total = selectedTests.reduce((sum, test) => sum + test.price, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Book Diagnostic Tests</h1>
      <p className="text-sm text-gray-500 mb-6">Search and select one or multiple diagnostic tests</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tests (e.g. CBC, Blood Glucose)..."
            className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          {loading && <p className="text-gray-500">Loading tests...</p>}
          {error && <p className="text-red-600">{error}</p>}

          {!loading && !error && filteredTests.length === 0 && (
            <p className="text-gray-500">No tests match your search.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTests.map((test) => {
              const isSelected = selectedIds.includes(test._id);
              return (
                <div
                  key={test._id}
                  className={`rounded-lg border p-4 transition ${
                    isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{test.testName}</h3>
                  <p className="text-sm text-gray-500 mt-1">Sample: {test.sampleType}</p>
                  <p className="text-sm text-gray-500">
                    Report: Within {test.estimatedDeliveryHours} hours
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sky-700 font-bold">৳{test.price}</span>
                    <button
                      type="button"
                      onClick={() => onToggleTest(test._id)}
                      className={`text-sm font-medium px-3 py-1 rounded-md border transition ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-sky-600 text-sky-700 hover:bg-sky-50'
                      }`}
                    >
                      {isSelected ? 'Added' : 'Add Test'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SelectedTestsPanel
            selectedTests={selectedTests}
            total={total}
            title="Your Selected Tests"
            footer={
              <button
                type="button"
                disabled={selectedTests.length === 0}
                onClick={onContinue}
                className={`w-full py-2 rounded-lg font-medium transition ${
                  selectedTests.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                Continue Booking
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}

export default TestSelection;
