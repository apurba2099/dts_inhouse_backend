const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },
    department: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    nickname: {
      type: String,
      default: "",
    },
    biography: {
      type: String,
      default: "",
      maxlength: 300,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    welcomeNotificationSent: {
      type: Boolean,
      default: false,
    },
    bloodGroup: { type: String, default: "" },
    dob: { type: String, default: "" },
    nationality: { type: String, default: "" },
    maritalStatus: { type: String, default: "" },
    marriageDate: { type: String, default: "" },
    spouse: { type: String, default: "" },
    placeOfBirth: { type: String, default: "" },
    residentialStatus: { type: String, default: "" },
    fatherName: { type: String, default: "" },
    religion: { type: String, default: "" },
    physicallyChallenged: { type: String, default: "No" },
    internationalEmployee: { type: String, default: "No" },
    height: { type: String, default: "" },
    weight: { type: String, default: "" },
    identificationMark: { type: String, default: "" },
    hobby: { type: String, default: "" },
    caste: { type: String, default: "" },
    address: { type: String, default: "" },
    addrName: { type: String, default: "" },
    addrEmail: { type: String, default: "" },
    phone1: { type: String, default: "" },
    phone2: { type: String, default: "" },
    mobile: { type: String, default: "" },
    extension: { type: String, default: "" },
    fax: { type: String, default: "" },
    degree: { type: String, default: "" },
    duration: { type: String, default: "" },
    institute: { type: String, default: "" },
    grade: { type: String, default: "" },
    isHighest: { type: String, default: "No" },
    bankName: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
    aadhaar: { type: String, default: "" },
    passport: { type: String, default: "" },
    passportExpiry: { type: String, default: "" },
    pan: { type: String, default: "" },
    fatherDob: { type: String, default: "" },
    fatherBloodGroup: { type: String, default: "" },
    fatherGender: { type: String, default: "Male" },
    fatherNationality: { type: String, default: "" },
    jobLocation: { type: String, default: "" },
    reportingTo: { type: String, default: "" },
    assets: {
      type: Array,
      default: [],
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);