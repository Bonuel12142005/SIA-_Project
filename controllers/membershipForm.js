const TODAY = () => new Date().toISOString().slice(0, 10);

const isValidDate = (value, { allowFuture = false } = {}) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) &&
    new Date(parsed).toISOString().slice(0, 10) === value &&
    (allowFuture || value <= TODAY());
};

export const normalizeMembershipForm = (body) => {
  const text = (field, maxLength) =>
    typeof body[field] === "string" ? body[field].trim().slice(0, maxLength) : "";
  const rawChildren = text("numberOfChildren", 3);
  return {
    firstName: text("firstName", 60),
    middleName: text("middleName", 60),
    lastName: text("lastName", 60),
    suffix: text("suffix", 20),
    address: text("address", 1000),
    barangay: text("barangay", 100),
    municipality: text("municipality", 100),
    province: text("province", 100),
    contactNumber: text("contactNumber", 40),
    birthDate: text("birthDate", 10),
    placeOfBirth: text("placeOfBirth", 200),
    sex: text("sex", 30),
    civilStatus: text("civilStatus", 30),
    spouseName: text("spouseName", 120),
    spouseOccupation: text("spouseOccupation", 120),
    fatherName: text("fatherName", 120),
    motherName: text("motherName", 120),
    numberOfChildren: rawChildren,
    occupation: text("occupation", 120),
    employer: text("employer", 120),
    memberType: text("memberType", 60),
    membershipDate: text("membershipDate", 10),
    signatureName: text("signatureName", 120),
    signedAt: text("signedAt", 10) || TODAY()
  };
};

export const validateMembershipForm = (application, { requireSignature = true } = {}) => {
  const errors = {};
  if (application.firstName.length < 1) errors.firstName = "Enter the applicant's first name.";
  if (application.lastName.length < 1) errors.lastName = "Enter the applicant's last name.";
  if ([application.firstName, application.middleName, application.lastName, application.suffix].filter(Boolean).join(" ").length > 120) {
    errors.fullName = "The applicant's full name must be 120 characters or fewer.";
  }
  if (application.address.length < 5) errors.address = "Enter a complete address of at least 5 characters.";
  if (!/^[+\d()\s.-]{7,40}$/.test(application.contactNumber) ||
      application.contactNumber.replace(/\D/g, "").length < 7) {
    errors.contactNumber = "Enter a valid contact number with at least 7 digits.";
  }
  if (application.birthDate && !isValidDate(application.birthDate)) {
    errors.birthDate = "Enter a valid date of birth that is not in the future.";
  }
  if (application.sex && !["Male", "Female", "Prefer not to say"].includes(application.sex)) {
    errors.sex = "Choose one of the listed options.";
  }
  if (application.civilStatus && !["Single", "Married", "Widowed", "Separated"].includes(application.civilStatus)) {
    errors.civilStatus = "Choose one of the listed options.";
  }
  if (!isValidDate(application.membershipDate)) {
    errors.membershipDate = "Enter a valid membership date that is not in the future.";
  }
  if (application.numberOfChildren &&
      (!/^\d{1,2}$/.test(application.numberOfChildren) || Number(application.numberOfChildren) > 50)) {
    errors.numberOfChildren = "Enter a number from 0 to 50.";
  }
  if (requireSignature && (!application.signatureName || application.signatureName.length < 2)) {
    errors.signatureName = "Enter the applicant's name as their signature.";
  }
  if (requireSignature && !isValidDate(application.signedAt)) errors.signedAt = "Enter a valid signature date.";
  return errors;
};

export const membershipFormValues = (application) => {
  const children = application.numberOfChildren === "" ||
    application.numberOfChildren === null ||
    application.numberOfChildren === undefined
    ? null
    : Number(application.numberOfChildren);
  return {
    ...application,
    name: [application.firstName, application.middleName, application.lastName, application.suffix]
      .filter(Boolean)
      .join(" "),
    numberOfChildren: children === null ? null : Number.isFinite(children) ? children : application.numberOfChildren,
    sexMale: application.sex === "Male",
    sexFemale: application.sex === "Female",
    sexOther: application.sex === "Prefer not to say",
    civilSingle: application.civilStatus === "Single",
    civilMarried: application.civilStatus === "Married",
    civilWidowed: application.civilStatus === "Widowed",
    civilSeparated: application.civilStatus === "Separated"
  };
};

export { TODAY as membershipToday };
