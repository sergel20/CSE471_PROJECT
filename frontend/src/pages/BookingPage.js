import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
import TestSelection from '../components/booking/TestSelection';
import PatientInfoForm from '../components/booking/PatientInfoForm';
import FinalSummary from '../components/booking/FinalSummary';

const STEPS = ['Select Tests', 'Patient Information', 'Summary'];

function StepIndicator({ step }) {
  return (
    <ol className="flex items-center justify-center gap-4 mb-8">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === step;
        const isDone = stepNumber < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                isActive
                  ? 'bg-sky-600 text-white'
                  : isDone
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {stepNumber}
            </span>
            <span className={`text-sm ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {label}
            </span>
            {stepNumber !== STEPS.length && <span className="w-8 h-px bg-gray-300 ml-2" />}
          </li>
        );
      })}
    </ol>
  );
}

function BookingPage() {
  const [step, setStep] = useState(1);

  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testsError, setTestsError] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [bookingRequest, setBookingRequest] = useState(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        setTestsLoading(true);
        const { data } = await apiClient.get('/tests');
        setTests(data);
        setTestsError('');
      } catch (err) {
        setTestsError('Failed to load diagnostic tests. Please make sure the server is running.');
      } finally {
        setTestsLoading(false);
      }
    };
    fetchTests();
  }, []);

  const selectedTests = useMemo(
    () => tests.filter((test) => selectedIds.includes(test._id)),
    [tests, selectedIds]
  );
  const clientTotal = selectedTests.reduce((sum, test) => sum + test.price, 0);

  const toggleTest = (testId) => {
    setSelectedIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const handlePatientInfoSubmit = async (formValues) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await apiClient.post('/bookings/preview', {
        testIds: selectedIds,
        patientInfo: formValues,
      });
      setPatientInfo(formValues);
      setPreview(data);
      setStep(3);
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || 'Failed to generate booking summary. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedPayment = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await apiClient.post('/bookings', {
        testIds: selectedIds,
        patientInfo,
      });
      setBookingRequest(data);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to send the payment confirmation request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <StepIndicator step={step} />

      {step === 1 && (
        <TestSelection
          tests={tests}
          loading={testsLoading}
          error={testsError}
          selectedIds={selectedIds}
          onToggleTest={toggleTest}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <PatientInfoForm
          selectedTests={selectedTests}
          total={clientTotal}
          initialValues={patientInfo}
          onBack={() => setStep(1)}
          onContinue={handlePatientInfoSubmit}
          submitting={submitting}
          submitError={submitError}
        />
      )}

      {step === 3 && preview && (
        <FinalSummary
          preview={preview}
          onBack={() => setStep(2)}
          onProceedPayment={handleProceedPayment}
          submitting={submitting}
          submitError={submitError}
          bookingRequest={bookingRequest}
        />
      )}
    </div>
  );
}

export default BookingPage;
