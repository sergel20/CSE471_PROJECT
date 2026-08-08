import { useState } from 'react';
import SelectedTestsPanel from './SelectedTestsPanel';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s]{7,15}$/;

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function PatientInfoForm({ selectedTests, total, initialValues, onBack, onContinue, submitting, submitError }) {
  const [form, setForm] = useState(
    initialValues || { preferredDate: '', fullName: '', phone: '', email: '', address: '' }
  );
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!PHONE_REGEX.test(form.phone.trim())) newErrors.phone = 'Enter a valid phone number.';
    if (!EMAIL_REGEX.test(form.email.trim())) newErrors.email = 'Enter a valid email address.';
    if (!form.address.trim()) newErrors.address = 'Address is required.';
    if (!form.preferredDate) {
      newErrors.preferredDate = 'Preferred date is required.';
    } else if (form.preferredDate < todayISO()) {
      newErrors.preferredDate = 'Preferred date cannot be in the past.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onContinue(form);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-gray-500 hover:text-gray-700 mb-3"
      >
        &larr; Back to test selection
      </button>
      <h1 className="text-2xl font-bold text-gray-900">Booking Information</h1>
      <p className="text-sm text-gray-500 mb-6">Choose your preferred date and provide contact information</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
            <input
              type="date"
              min={todayISO()}
              value={form.preferredDate}
              onChange={handleChange('preferredDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {errors.preferredDate && <p className="text-sm text-red-600 mt-1">{errors.preferredDate}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Jane Doe"
              />
              {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={handleChange('phone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="017XXXXXXXX"
              />
              {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="jane@example.com"
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={handleChange('address')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="House, Road, Area, City"
            />
            {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address}</p>}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-lg font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Please wait...' : 'Review Booking'}
          </button>
        </form>

        <div>
          <SelectedTestsPanel
            selectedTests={selectedTests}
            total={total}
            preferredDate={formatDisplayDate(form.preferredDate)}
          />
        </div>
      </div>
    </div>
  );
}

export default PatientInfoForm;
