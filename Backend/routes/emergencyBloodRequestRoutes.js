const express = require("express");
const router = express.Router();

const {
    createRequest,
    getAllRequests,
    updateStatus
} = require("../controllers/emergencyBloodRequestController");


router.post("/", createRequest);

router.get("/", getAllRequests);

router.put("/:id/status", updateStatus);


module.exports = router;