function FinalSummary({ preview, onBack, onProceedPayment, submitting, submitError, bookingRequest }) {
  const { tests, patientInfo, preferredDate, totalPrice, paymentStatus } = preview;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Booking Summary</h2>
        <span className="text-xs font-medium uppercase tracking-wide bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
          Payment {paymentStatus || 'pending'}
        </span>
      </div>

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
          Selected Tests ({tests.length})
        </h3>
        <ol className="divide-y divide-gray-100 list-none">
          {tests.map((test, index) => (
            <li key={test._id} className="flex items-center justify-between py-2">
              <span className="text-gray-700">
                {index + 1}. {test.testName}
              </span>
              <span className="font-medium text-gray-900">৳{test.price}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Patient Information</h3>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-gray-500">Full Name</dt>
          <dd className="text-gray-800">{patientInfo.fullName}</dd>
          <dt className="text-gray-500">Phone</dt>
          <dd className="text-gray-800">{patientInfo.phone}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="text-gray-800">{patientInfo.email}</dd>
          <dt className="text-gray-500">Address</dt>
          <dd className="text-gray-800">{patientInfo.address}</dd>
          <dt className="text-gray-500">Preferred Date</dt>
          <dd className="text-gray-800">{new Date(preferredDate).toLocaleDateString()}</dd>
        </dl>
      </section>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4 mb-6">
        <span className="font-semibold text-gray-800">Total Price</span>
        <span className="text-xl font-bold text-sky-700">৳{totalPrice}</span>
      </div>

      {bookingRequest && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
          {bookingRequest.message} Booking ID: {bookingRequest.booking?._id}
        </p>
      )}

      {submitError && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          {submitError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting || Boolean(bookingRequest)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onProceedPayment}
          disabled={submitting || Boolean(bookingRequest)}
          className="flex-1 py-2 rounded-lg font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {bookingRequest ? 'Request Sent' : submitting ? 'Sending Request...' : 'Proceed to Payment'}
        </button>
      </div>
    </div>
  );
}

export default FinalSummary;
