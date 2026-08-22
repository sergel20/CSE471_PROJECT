const EmergencyBloodRequest = require("../models/EmergencyBloodRequest");


// Create blood request
exports.createRequest = async (req, res) => {
  try {

    const request = new EmergencyBloodRequest(req.body);

    await request.save();

    res.status(201).json({
      message: "Emergency blood request created successfully",
      request
    });

  } catch(error){

    res.status(500).json({
      message: "Failed to create request",
      error: error.message
    });

  }
};


// Get all requests
exports.getAllRequests = async(req,res)=>{

  try{

    const requests = await EmergencyBloodRequest.find();

    res.json(requests);

  }catch(error){

    res.status(500).json({
      message:error.message
    });

  }

};


// Update status
exports.updateStatus = async(req,res)=>{

  try{

    const request = await EmergencyBloodRequest.findByIdAndUpdate(
      req.params.id,
      {
        requestStatus:req.body.status
      },
      {
        new:true
      }
    );

    res.json(request);

  }catch(error){

    res.status(500).json({
      message:error.message
    });

  }

};