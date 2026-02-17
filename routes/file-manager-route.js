const express = require('express');
const router = express.Router();
const fileManagerController = require('../controllers/file-manager-controller');
const { requireAnyAuth, checkAnyUser } = require('../middleware/auth-middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/assets/uploads/');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Apply checkAnyUser to all routes to populate res.locals.user
router.use(checkAnyUser);

router.get('/', requireAnyAuth, fileManagerController.listFiles);
router.post('/upload', requireAnyAuth, upload.single('file'), fileManagerController.uploadFile);
router.post('/folder', requireAnyAuth, fileManagerController.createFolder);
router.post('/rename', requireAnyAuth, fileManagerController.renameItem);
router.post('/delete', requireAnyAuth, fileManagerController.deleteItem);
router.post('/star', requireAnyAuth, fileManagerController.toggleStar);
router.post('/paste', requireAnyAuth, fileManagerController.pasteItems);
router.post('/restore', requireAnyAuth, fileManagerController.restoreItems);
router.get('/info/:id', requireAnyAuth, fileManagerController.getFolderInfo);

module.exports = router;
