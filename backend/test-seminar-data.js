const db = require("./config/db");

(async () => {
    try {
        // Check all seminar requests
        const [all] = await db.query("SELECT id, seminar_date, status FROM seminar_schedule_requests ORDER BY seminar_date DESC LIMIT 10");
        console.log("All seminar requests (latest 10):");
        console.log(all);

        // Check count by date
        const [byDate] = await db.query(`
            SELECT DATE_FORMAT(seminar_date, '%Y-%m-%d') AS date, COUNT(*) AS cnt, 
                   SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved
            FROM seminar_schedule_requests
            GROUP BY DATE_FORMAT(seminar_date, '%Y-%m-%d')
            ORDER BY date DESC
            LIMIT 5
        `);
        console.log("\nSeminar requests by date:");
        console.log(byDate);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err.message);
        process.exit(1);
    }
})();
