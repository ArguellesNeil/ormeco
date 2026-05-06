const router7 = require("express").Router();
const controller7 = require("../controllers/mobile.report_incident.controller");
const multer = require("multer");

const allowedMimes = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        if (allowedMimes.has(file.mimetype)) return cb(null, true);
        return cb(new Error("Invalid file type. Only images, PDFs, and Office documents are allowed."), false);
    },
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 10
    }
});

router7.post(
    "/incidents/report",
    upload.fields([
        { name: "files[]", maxCount: 10 },
        { name: "files", maxCount: 10 }
    ]),
    (req, _res, next) => {
        const fileGroups = req.files;
        if (Array.isArray(fileGroups)) {
            req.files = fileGroups;
        } else if (fileGroups && typeof fileGroups === "object") {
            req.files = Object.values(fileGroups).flat();
        } else {
            req.files = [];
        }
        next();
    },
    controller7.reportIncident
);

router7.use((error, _req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ status: "fail", message: "File size exceeds 10 MB limit" });
        }

        if (error.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({ status: "fail", message: "Too many files. Maximum 10 files allowed" });
        }

        return res.status(400).json({ status: "fail", message: `Upload error: ${error.message}` });
    }

    if (error) {
        return res.status(400).json({ status: "fail", message: error.message || "File upload failed" });
    }

    next();
});

module.exports = router7;