const db = require("./config/db");

(async () => {
    try {
        // Insert test data for today
        const userId = 1; // Assuming user 1 exists
        
        await db.query(`
            INSERT INTO seminar_schedule_requests (user_id, seminar_date, start_time, end_time, status, created_at)
            VALUES (?, CURDATE(), '09:00:00', '11:00:00', 'pending', NOW()),
                   (?, CURDATE(), '14:00:00', '16:00:00', 'approved', NOW())
        `, [userId, userId]);

        console.log("Test data inserted for today!");

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
