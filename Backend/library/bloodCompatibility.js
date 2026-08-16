// Standard ABO/Rh donor-compatibility chart: for a given recipient blood group,
// which donor blood groups may donate to them.
const DONOR_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

// Returns the list of donor blood groups compatible with the given recipient blood group.
function getCompatibleDonorBloodGroups(recipientBloodGroup) {
  return DONOR_COMPATIBILITY[recipientBloodGroup] || [];
}

module.exports = { getCompatibleDonorBloodGroups };
