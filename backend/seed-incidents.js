const db = require("./db.cjs");
const fs = require("fs");
const path = require("path");

// Sample incident categories and descriptions
const categories = ["power_outage", "meter_issue", "billing_complaint", "service_request", "damage_report"];
const descriptions = [
    "Power is completely down in my area",
    "Meter is running fast, consumption seems wrong",
    "My billing is much higher than usual",
    "I need a meter inspection",
    "There's damage to the meter box",
    "No power for the past 3 hours",
    "Meter display is not working properly",
    "Concerned about high electricity rates"
];

// Create sample image (1x1 red pixel PNG)
const createSampleImage = () => {
    return Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
};

async function seedIncidents() {
    try {
        // Get existing users
        const [users] = await db.query("SELECT id FROM users LIMIT 10");
        const [meters] = await db.query("SELECT id FROM meters LIMIT 10");

        if (users.length === 0) {
            console.error("❌ No users found. Please add users first.");
            process.exit(1);
        }

        console.log(`📊 Found ${users.length} users and ${meters.length} meters`);

        // Create incident evidence directory
        const evidenceDir = path.join(__dirname, "uploads", "incident_evidence");
        if (!fs.existsSync(evidenceDir)) {
            fs.mkdirSync(evidenceDir, { recursive: true });
        }

        const incidents = [];
        const timestamp = Date.now();

        // Generate 30 sample incidents with dates spread across the last 7 days
        for (let i = 0; i < 30; i++) {
            const userId = users[i % users.length].id;
            const meterId = meters.length > 0 ? meters[i % meters.length].id : null;
            const category = categories[i % categories.length];
            const description = descriptions[i % descriptions.length];
            
            // Set reported_at to a date within the last 7 days (for reporting accuracy)
            const daysAgo = Math.floor(i / 5); // Spread across roughly 6 days
            const reportedDate = new Date();
            reportedDate.setDate(reportedDate.getDate() - daysAgo);
            reportedDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0);

            incidents.push([userId, meterId, category, description, reportedDate]);
        }

        console.log(`\n🔄 Inserting ${incidents.length} sample incidents...`);

        // Bulk insert with reported_at dates
        const sql = `INSERT INTO incident_reports (user_id, meter_id, category, description, reported_at) 
                     VALUES (?, ?, ?, ?, ?)`;

        let insertedCount = 0;
        for (const incident of incidents) {
            try {
                const [result] = await db.query(sql, incident);
                const incidentId = result.insertId;

                // Add 1-3 sample evidence files
                const fileCount = Math.floor(Math.random() * 3) + 1;
                const sampleImage = createSampleImage();

                for (let j = 0; j < fileCount; j++) {
                    const fileName = `${timestamp + j}_${incidentId}_${incident[0]}_sample_image_${j + 1}.png`;
                    fs.writeFileSync(path.join(evidenceDir, fileName), sampleImage);
                }

                insertedCount++;
                if (insertedCount % 10 === 0) {
                    console.log(`✅ Inserted ${insertedCount} incidents...`);
                }
            } catch (err) {
                console.error(`❌ Error inserting incident:`, err.message);
            }
        }

        console.log(`\n✨ Successfully seeded ${insertedCount} incidents with sample evidence files!`);
        console.log(`📁 Evidence files saved to: ${evidenceDir}`);
        
    } catch (err) {
        console.error("❌ Seeding error:", err);
    } finally {
        process.exit(0);
    }
}

seedIncidents();
