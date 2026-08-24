import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';

const STATUS_CONTENT = {
  success: {
    heading: 'Payment successful',
    tone: 'emerald',
    message: 'Your payment was received. The admin will confirm your booking and generate your sample ID shortly.',
  },
  failed: {
    heading: 'Payment failed',
    tone: 'red',
    message: 'The payment could not be completed. You can try again from your bookings.',
  },
  cancel: {
    heading: 'Payment cancelled',
    tone: 'amber',
    message: 'You cancelled the payment before it completed. No charge was made.',
  },
  error: {
    heading: 'Something went wrong',
    tone: 'red',
    message: 'We could not confirm the payment status. Please check your booking status or contact support.',
  },
};

const TONE_STYLES = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
};

function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'error';
  const bookingId = searchParams.get('bookingId');
  const message = searchParams.get('message');

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const content = STATUS_CONTENT[status] || STATUS_CONTENT.error;

  useEffect(() => {
    // Nothing to fetch yet — this page just reflects what the backend redirect told us.
    // The booking's real paymentStatus lives in the database and is what the admin acts on.
  }, []);

  const downloadInvoice = async () => {
    if (!bookingId) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const response = await apiClient.get(`/payments/${bookingId}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError('Invoice is not available yet. It unlocks once payment is confirmed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{content.heading}</h1>

        <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${TONE_STYLES[content.tone]}`}>
          {content.message}
          {status === 'error' && message && (
            <p className="mt-1 text-xs opacity-80">Details: {decodeURIComponent(message)}</p>
          )}
        </div>

        {bookingId && (
          <p className="mb-6 text-xs text-gray-400">
            Booking reference: <span className="font-mono">{bookingId}</span>
          </p>
        )}

        {downloadError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {downloadError}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {status === 'success' && bookingId && (
            <button
              type="button"
              onClick={downloadInvoice}
              disabled={downloading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-gray-300"
            >
              {downloading ? 'Preparing invoice...' : 'Download Invoice'}
            </button>
          )}

          <Link
            to="/sample-status"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Track My Samples
          </Link>

          {status !== 'success' && (
            <Link
              to="/booking"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Booking
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentResultPage;