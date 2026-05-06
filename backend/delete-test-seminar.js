const db = require("./config/db");

(async () => {
    try {
        // Delete test data inserted for today (May 7)
        const result = await db.query("DELETE FROM seminar_schedule_requests WHERE DATE(seminar_date) = CURDATE() AND id IN (11, 12)");
        
        console.log("Test data deleted!");

        // Verify
        const [[count]] = await db.query("SELECT COUNT(*) AS cnt FROM seminar_schedule_requests WHERE DATE(seminar_date) = CURDATE()");
        const [[approved]] = await db.query("SELECT COUNT(*) AS cnt FROM seminar_schedule_requests WHERE DATE(seminar_date) = CURDATE() AND status = 'approved'");
        
        console.log("Total requests today:", count.cnt);
        console.log("Approved today:", approved.cnt);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
})();
