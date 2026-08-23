// Mirrors Backend/models/User.js ROLES. Keep both lists in sync.
export const ROLES = {
  PATIENT: 'patient',
  LAB_STAFF: 'lab_staff',
  DOCTOR: 'doctor',
  DONOR: 'donor',
  HOSPITAL_STAFF: 'hospital_staff',
  PHARMACY: 'pharmacy',
  ADMIN: 'admin',
};

export const ROLE_OPTIONS = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.PATIENT]: 'Patient',
  [ROLES.LAB_STAFF]: 'Lab Staff',
  [ROLES.DOCTOR]: 'Doctor / Report Approver',
  [ROLES.DONOR]: 'Blood Donor',
  [ROLES.HOSPITAL_STAFF]: 'Hospital Staff',
  [ROLES.PHARMACY]: 'Pharmacy',
  [ROLES.ADMIN]: 'Admin',
};

// Where each role lands after login, and what "Home" resolves to for that role.
export const ROLE_HOME = {
  [ROLES.PATIENT]: '/booking',
  [ROLES.LAB_STAFF]: '/results',
  [ROLES.DOCTOR]: '/report-approval',
  [ROLES.DONOR]: '/donor-profile',
  [ROLES.HOSPITAL_STAFF]: '/dashboard',
  [ROLES.PHARMACY]: '/pharmacy-stock',
  [ROLES.ADMIN]: '/admin/bookings',
};
