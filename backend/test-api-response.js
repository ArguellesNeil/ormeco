const api = require("./config/db");
const seminarController = require("./controllers/seminar_schedule.controller");

// Mock res object for testing
const mockRes = {
    json: (data) => {
        console.log("API Response:");
        console.log(JSON.stringify(data, null, 2));
    },
    status: (code) => ({
        json: (data) => {
            console.log(`Error (${code}):`, data);
        }
    })
};

// Mock req object
const mockReq = {
    query: {}
};

(async () => {
    try {
        await seminarController.getAllScheduleRequests(mockReq, mockRes);
    } catch (err) {
        console.error("Error:", err.message);
    }
})();
