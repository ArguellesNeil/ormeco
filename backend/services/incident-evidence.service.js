const fs = require("fs");
const path = require("path");

const INCIDENT_EVIDENCE_DIR = path.join(__dirname, "..", "uploads", "incident_evidence");

const ensureIncidentEvidenceDir = () => {
    if (!fs.existsSync(INCIDENT_EVIDENCE_DIR)) {
        fs.mkdirSync(INCIDENT_EVIDENCE_DIR, { recursive: true });
    }

    return INCIDENT_EVIDENCE_DIR;
};

const sanitizeFileName = (value) => String(value || "file").replace(/[^a-zA-Z0-9.-]/g, "_");

const buildEvidenceFileName = ({ incidentId, userId, originalName }) => {
    const timestamp = Date.now();
    const safeName = sanitizeFileName(originalName || "evidence");
    return `${timestamp}_${incidentId}_${userId}_${safeName}`;
};

const isIncidentEvidenceFile = (fileName, incidentId) => {
    const safeName = path.basename(String(fileName || ""));
    if (!safeName) return false;
    return safeName.includes(`_${incidentId}_`);
};

const listEvidenceFiles = (incidentId, baseUrl) => {
    const safeIncidentId = Number.parseInt(String(incidentId || "0"), 10);
    if (!Number.isFinite(safeIncidentId) || safeIncidentId <= 0) return [];

    ensureIncidentEvidenceDir();

    if (!fs.existsSync(INCIDENT_EVIDENCE_DIR)) return [];

    return fs
        .readdirSync(INCIDENT_EVIDENCE_DIR, { withFileTypes: true })
        .filter((entry) => entry.isFile() && isIncidentEvidenceFile(entry.name, safeIncidentId))
        .map((entry) => {
            const fileName = entry.name;
            const absolutePath = path.join(INCIDENT_EVIDENCE_DIR, fileName);
            const stat = fs.statSync(absolutePath);
            const parts = fileName.split("_");
            const timestamp = Number(parts[0]);
            const originalName = parts.length >= 4 ? parts.slice(3).join("_") : fileName;
            const uploadedAt = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : stat.mtime.toISOString();

            const relative = `/api/incidents/${safeIncidentId}/evidence/${encodeURIComponent(fileName)}`;
            const url = baseUrl ? `${baseUrl}${relative}` : relative;

            return {
                fileName,
                originalName,
                uploadedAt,
                sizeBytes: stat.size,
                extension: path.extname(originalName || fileName).replace(".", "").toLowerCase(),
                url
            };
        })
        .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
};

const saveEvidenceFiles = async({ incidentId, userId, files, baseUrl }) => {
    const safeIncidentId = Number.parseInt(String(incidentId || "0"), 10);
    const safeUserId = Number.parseInt(String(userId || "0"), 10);

    if (!Number.isFinite(safeIncidentId) || safeIncidentId <= 0) return [];

    ensureIncidentEvidenceDir();

    const inputFiles = Array.isArray(files) ? files : [];
    const savedFiles = [];

    for (const file of inputFiles) {
        if (!file || !file.buffer) continue;

        const fileName = buildEvidenceFileName({
            incidentId: safeIncidentId,
            userId: Number.isFinite(safeUserId) && safeUserId > 0 ? safeUserId : "unknown",
            originalName: file.originalname || file.name || "evidence"
        });

        const absolutePath = path.join(INCIDENT_EVIDENCE_DIR, fileName);
        await fs.promises.writeFile(absolutePath, file.buffer);

        const relative = `/api/incidents/${safeIncidentId}/evidence/${encodeURIComponent(fileName)}`;
        const url = baseUrl ? `${baseUrl}${relative}` : relative;

        savedFiles.push({
            fileName,
            originalName: file.originalname || file.name || "evidence",
            uploadedAt: new Date().toISOString(),
            sizeBytes: file.size || file.buffer.length || 0,
            extension: path.extname(file.originalname || file.name || fileName).replace(".", "").toLowerCase(),
            url
        });
    }

    return savedFiles;
};

const getEvidenceFilePath = (incidentId, requestedFileName) => {
    const safeIncidentId = Number.parseInt(String(incidentId || "0"), 10);
    const safeName = path.basename(String(requestedFileName || ""));

    if (!Number.isFinite(safeIncidentId) || safeIncidentId <= 0 || !safeName || !isIncidentEvidenceFile(safeName, safeIncidentId)) {
        return null;
    }

    const absolutePath = path.join(INCIDENT_EVIDENCE_DIR, safeName);
    if (!fs.existsSync(absolutePath)) return null;

    return absolutePath;
};

module.exports = {
    INCIDENT_EVIDENCE_DIR,
    ensureIncidentEvidenceDir,
    listEvidenceFiles,
    saveEvidenceFiles,
    getEvidenceFilePath
};