const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    getEmployees,
    forgotPassword,
    resetPassword,
    getMyProfile,
    updateMyProfile,
    uploadProfilePicture,
    changePassword,
    updateEmployee,
    uploadEmployeePicture,
    uploadEmployeeAsset,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload.middleware");

router.post("/register", protect, authorize('admin'), registerUser);
router.post("/login", loginUser);
router.get("/employees", protect, authorize('admin'), getEmployees);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);
router.post("/me/picture", protect, upload.single("picture"), uploadProfilePicture);
router.put("/change-password", protect, changePassword);


router.put("/employees/:id", protect, authorize("admin"), updateEmployee);
router.post("/employees/:id/picture", protect, authorize("admin"), upload.single("picture"), uploadEmployeePicture);
router.post("/employees/:id/asset", protect, authorize("admin"), upload.single("file"), uploadEmployeeAsset);

module.exports = router;