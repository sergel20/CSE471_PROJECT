function SelectedTestsPanel({ selectedTests, total, title = 'Selected Tests', preferredDate, footer }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-24">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {title}
        {selectedTests.length > 0 && ` (${selectedTests.length})`}
      </h2>

      {selectedTests.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">No tests selected yet.</p>
      ) : (
        <ol className="divide-y divide-gray-100 mb-4 list-none">
          {selectedTests.map((test, index) => (
            <li key={test._id} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">
                {index + 1}. {test.testName}
              </span>
              <span className="text-sm font-medium text-gray-900">৳{test.price}</span>
            </li>
          ))}
        </ol>
      )}

      {preferredDate && (
        <div className="mb-4">
          <p className="text-xs text-gray-500">Preferred Date</p>
          <p className="text-sm font-semibold text-gray-800">{preferredDate}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 pt-3 mb-4">
        <span className="font-semibold text-gray-800">Total</span>
        <span className="text-lg font-bold text-sky-700">৳{total}</span>
      </div>

      {footer}
    </div>
  );
}

export default SelectedTestsPanel;
