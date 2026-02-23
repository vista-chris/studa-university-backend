const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/library-controller');
const { requireAuth, studentRequireAuth, requireAnyAuth } = require('../middleware/auth-middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for book cover uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/library/covers';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// ============================================
// PUBLIC/STUDENT ROUTES
// ============================================

// Browse books (public/authenticated)
router.get('/books', libraryController.fetchBooks);

// Get book details
router.get('/books/:id', libraryController.fetchBookById);

// Get all categories
router.get('/categories', libraryController.fetchCategories);

// Get library settings
router.get('/settings', libraryController.getLibrarySettings);

// ============================================
// STUDENT-ONLY ROUTES
// ============================================

// Get my borrowed books
router.get('/my-borrowed', studentRequireAuth, libraryController.fetchBorrowedBooks);

// Get my borrowing history
router.get('/my-history', studentRequireAuth, libraryController.fetchBorrowingHistory);

// Get my fines
router.get('/my-fines', studentRequireAuth, libraryController.fetchStudentFines);

// Get my reservations
router.get('/my-reservations', studentRequireAuth, libraryController.fetchStudentReservations);

// Reserve a book
router.post('/reserve/:bookId', studentRequireAuth, libraryController.reserveBook);

// Cancel reservation
router.delete('/reserve/:reservationId', studentRequireAuth, libraryController.cancelReservation);

// Renew borrowed book
router.post('/renew/:borrowRecordId', studentRequireAuth, libraryController.renewBook);

// ============================================
// LIBRARIAN/ADMIN ROUTES (Staff Auth)
// ============================================

// Book Management
router.post('/books', requireAuth, libraryController.addBook);
router.put('/books/:id', requireAuth, libraryController.updateBook);
router.delete('/books/:id', requireAuth, libraryController.deleteBook);
router.post('/books/:id/cover', requireAuth, upload.single('cover'), libraryController.uploadBookCover);

// Category Management
router.post('/categories', requireAuth, libraryController.addCategory);
router.put('/categories/:id', requireAuth, libraryController.updateCategory);
router.delete('/categories/:id', requireAuth, libraryController.deleteCategory);

// Borrowing Operations
router.post('/borrow', requireAuth, libraryController.borrowBook);
router.post('/return/:borrowRecordId', requireAuth, libraryController.returnBook);
router.get('/borrow-records', requireAuth, libraryController.fetchAllBorrowRecords);

// Fine Management
router.get('/fines', requireAuth, libraryController.fetchAllFines);
router.post('/fines/:fineId/pay', requireAuth, libraryController.payFine);
router.post('/fines/:fineId/waive', requireAuth, libraryController.waiveFine);

// Reservation Management
router.get('/reservations', requireAuth, libraryController.fetchAllReservations);
router.post('/reservations/:reservationId/fulfill', requireAuth, libraryController.fulfillReservation);

// Analytics
router.get('/analytics', requireAuth, libraryController.getLibraryAnalytics);

// ============================================
// ADMIN-ONLY ROUTES
// ============================================

// Settings Management (Admin only - we'll add admin check later if needed)
router.put('/settings', requireAuth, libraryController.updateLibrarySettings);

module.exports = router;
