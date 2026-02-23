const Book = require('../models/book-model');
const Category = require('../models/category-model');
const BorrowRecord = require('../models/borrow-record-model');
const Fine = require('../models/fine-model');
const Reservation = require('../models/reservation-model');
const LibrarySettings = require('../models/library-settings-model');
const Student = require('../models/student-model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// BOOK MANAGEMENT
// ============================================

// Fetch all books with search, filters, and pagination
const fetchBooks = async (req, res) => {
    try {
        const { search, category, status, language, page = 1, limit = 20 } = req.query;

        let query = {};

        // Text search on title, author, ISBN
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } },
                { isbn: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by category
        if (category) {
            query.category = category;
        }

        // Filter by status
        if (status) {
            query.status = status;
        } else {
            // Default: only show active books
            query.status = 'active';
        }

        // Filter by language
        if (language) {
            query.language = language;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const books = await Book.find(query)
            .populate('category')
            .sort({ title: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Book.countDocuments(query);

        res.status(200).json({
            books,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Fetch books error:', error);
        res.status(500).json({ error: 'Failed to fetch books' });
    }
};

// Fetch single book by ID
const fetchBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await Book.findById(id).populate('category');

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.status(200).json({ book });
    } catch (error) {
        console.error('Fetch book error:', error);
        res.status(500).json({ error: 'Failed to fetch book' });
    }
};

// Add new book
const addBook = async (req, res) => {
    try {
        const {
            isbn, title, author, publisher, publicationYear, edition,
            category, description, totalCopies, location, language, pages
        } = req.body;

        // Check if ISBN already exists (if provided)
        if (isbn) {
            const existing = await Book.findOne({ isbn });
            if (existing) {
                return res.status(400).json({ error: 'Book with this ISBN already exists' });
            }
        }

        const book = await Book.create({
            isbn, title, author, publisher, publicationYear, edition,
            category, description, totalCopies,
            availableCopies: totalCopies, // Initially all copies are available
            location, language, pages
        });

        const populatedBook = await Book.findById(book._id).populate('category');

        res.status(201).json({
            success: 'Book added successfully',
            book: populatedBook
        });
    } catch (error) {
        console.error('Add book error:', error);
        res.status(500).json({ error: 'Failed to add book' });
    }
};

// Update book
const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow direct update of availableCopies (managed by borrowing system)
        delete updateData.availableCopies;

        const book = await Book.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('category');

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.status(200).json({
            success: 'Book updated successfully',
            book
        });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ error: 'Failed to update book' });
    }
};

// Delete/Archive book
const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if book has active borrow records
        const activeBorrows = await BorrowRecord.countDocuments({
            book: id,
            status: { $in: ['borrowed', 'overdue'] }
        });

        if (activeBorrows > 0) {
            return res.status(400).json({
                error: 'Cannot delete book with active borrow records. Archive it instead.'
            });
        }

        // Archive instead of delete
        const book = await Book.findByIdAndUpdate(
            id,
            { status: 'archived' },
            { new: true }
        );

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.status(200).json({
            success: 'Book archived successfully'
        });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
};

// Upload book cover
const uploadBookCover = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const coverPath = `/uploads/library/covers/${req.file.filename}`;

        const book = await Book.findByIdAndUpdate(
            id,
            { coverImage: coverPath },
            { new: true }
        ).populate('category');

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.status(200).json({
            success: 'Cover uploaded successfully',
            book
        });
    } catch (error) {
        console.error('Upload cover error:', error);
        res.status(500).json({ error: 'Failed to upload cover' });
    }
};

// ============================================
// CATEGORY MANAGEMENT
// ============================================

// Fetch all categories
const fetchCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.status(200).json({ categories });
    } catch (error) {
        console.error('Fetch categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// Add category
const addCategory = async (req, res) => {
    try {
        const { name, description, code } = req.body;

        const category = await Category.create({ name, description, code });

        res.status(201).json({
            success: 'Category added successfully',
            category
        });
    } catch (error) {
        console.error('Add category error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Category name or code already exists' });
        }
        res.status(500).json({ error: 'Failed to add category' });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, code } = req.body;

        const category = await Category.findByIdAndUpdate(
            id,
            { name, description, code },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(200).json({
            success: 'Category updated successfully',
            category
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category has books
        const bookCount = await Book.countDocuments({ category: id });

        if (bookCount > 0) {
            return res.status(400).json({
                error: `Cannot delete category with ${bookCount} book(s). Reassign books first.`
            });
        }

        const category = await Category.findByIdAndDelete(id);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.status(200).json({
            success: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
};

// ============================================
// BORROWING OPERATIONS
// ============================================

// Get library settings (helper function)
const getSettings = async () => {
    let settings = await LibrarySettings.findOne();
    if (!settings) {
        // Create default settings if none exist
        settings = await LibrarySettings.create({});
    }
    return settings;
};

// Process book borrowing
const borrowBook = async (req, res) => {
    try {
        const { studentId, bookId, dueDate } = req.body;
        const processedBy = req.user._id; // Librarian processing the borrow

        const settings = await getSettings();

        // Check if student exists
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if book exists and is available
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        if (book.availableCopies < 1) {
            return res.status(400).json({ error: 'No copies available for borrowing' });
        }

        // Check student's current borrowed books count
        const currentBorrows = await BorrowRecord.countDocuments({
            student: studentId,
            status: { $in: ['borrowed', 'overdue'] }
        });

        if (currentBorrows >= settings.maxBooksPerStudent) {
            return res.status(400).json({
                error: `Student has reached maximum borrowing limit of ${settings.maxBooksPerStudent} books`
            });
        }

        // Check if student has outstanding fines exceeding limit
        const pendingFines = await Fine.aggregate([
            {
                $match: {
                    student: student._id,
                    status: 'pending'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const totalFines = pendingFines.length > 0 ? pendingFines[0].total : 0;

        if (totalFines > settings.maxOutstandingFine) {
            return res.status(400).json({
                error: `Student has outstanding fines of KES ${totalFines}. Maximum allowed is KES ${settings.maxOutstandingFine}`
            });
        }

        // Calculate due date if not provided
        let calculatedDueDate = dueDate;
        if (!calculatedDueDate) {
            const borrowDate = new Date();
            calculatedDueDate = new Date(borrowDate);
            calculatedDueDate.setDate(calculatedDueDate.getDate() + settings.borrowingPeriodDays);
        }

        // Create borrow record
        const borrowRecord = await BorrowRecord.create({
            student: studentId,
            book: bookId,
            dueDate: calculatedDueDate,
            processedBy,
            status: 'borrowed'
        });

        // Decrease available copies
        book.availableCopies -= 1;
        await book.save();

        const populatedRecord = await BorrowRecord.findById(borrowRecord._id)
            .populate('student')
            .populate('book')
            .populate('processedBy');

        res.status(201).json({
            success: 'Book borrowed successfully',
            borrowRecord: populatedRecord
        });
    } catch (error) {
        console.error('Borrow book error:', error);
        res.status(500).json({ error: 'Failed to process borrowing' });
    }
};

// Process book return
const returnBook = async (req, res) => {
    try {
        const { borrowRecordId } = req.params;

        const settings = await getSettings();

        const borrowRecord = await BorrowRecord.findById(borrowRecordId)
            .populate('book')
            .populate('student');

        if (!borrowRecord) {
            return res.status(404).json({ error: 'Borrow record not found' });
        }

        if (borrowRecord.status === 'returned') {
            return res.status(400).json({ error: 'Book already returned' });
        }

        // Update borrow record
        borrowRecord.returnDate = new Date();
        borrowRecord.status = 'returned';
        await borrowRecord.save();

        // Increase available copies
        const book = await Book.findById(borrowRecord.book._id);
        book.availableCopies += 1;
        await book.save();

        // Calculate fine if overdue
        let fine = null;
        const today = new Date();
        const dueDate = new Date(borrowRecord.dueDate);

        if (today > dueDate) {
            const daysOverdue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            const fineAmount = daysOverdue * settings.finePerDay;

            fine = await Fine.create({
                student: borrowRecord.student._id,
                borrowRecord: borrowRecord._id,
                amount: fineAmount,
                reason: 'overdue',
                daysOverdue,
                status: 'pending'
            });
        }

        res.status(200).json({
            success: 'Book returned successfully',
            borrowRecord,
            fine: fine || null
        });
    } catch (error) {
        console.error('Return book error:', error);
        res.status(500).json({ error: 'Failed to process return' });
    }
};

// Renew borrowed book
const renewBook = async (req, res) => {
    try {
        const { borrowRecordId } = req.params;

        const settings = await getSettings();

        const borrowRecord = await BorrowRecord.findById(borrowRecordId).populate('book');

        if (!borrowRecord) {
            return res.status(404).json({ error: 'Borrow record not found' });
        }

        if (borrowRecord.status !== 'borrowed') {
            return res.status(400).json({ error: 'Can only renew active borrowings' });
        }

        if (borrowRecord.renewalCount >= settings.maxRenewals) {
            return res.status(400).json({
                error: `Maximum renewal limit of ${settings.maxRenewals} reached`
            });
        }

        // Check if book has pending reservations
        const pendingReservations = await Reservation.countDocuments({
            book: borrowRecord.book._id,
            status: 'active'
        });

        if (pendingReservations > 0) {
            return res.status(400).json({
                error: 'Cannot renew. Book has pending reservations.'
            });
        }

        // Extend due date
        const newDueDate = new Date(borrowRecord.dueDate);
        newDueDate.setDate(newDueDate.getDate() + settings.borrowingPeriodDays);

        borrowRecord.dueDate = newDueDate;
        borrowRecord.renewalCount += 1;
        await borrowRecord.save();

        res.status(200).json({
            success: 'Book renewed successfully',
            borrowRecord
        });
    } catch (error) {
        console.error('Renew book error:', error);
        res.status(500).json({ error: 'Failed to renew book' });
    }
};

// Fetch student's currently borrowed books
const fetchBorrowedBooks = async (req, res) => {
    try {
        const studentId = req.student._id; // From auth middleware

        const borrowedBooks = await BorrowRecord.find({
            student: studentId,
            status: { $in: ['borrowed', 'overdue'] }
        })
            .populate('book')
            .populate({
                path: 'book',
                populate: { path: 'category' }
            })
            .sort({ borrowDate: -1 });

        res.status(200).json({ borrowedBooks });
    } catch (error) {
        console.error('Fetch borrowed books error:', error);
        res.status(500).json({ error: 'Failed to fetch borrowed books' });
    }
};

// Fetch student's borrowing history
const fetchBorrowingHistory = async (req, res) => {
    try {
        const studentId = req.student._id;

        const history = await BorrowRecord.find({
            student: studentId
        })
            .populate('book')
            .populate({
                path: 'book',
                populate: { path: 'category' }
            })
            .sort({ borrowDate: -1 });

        res.status(200).json({ history });
    } catch (error) {
        console.error('Fetch history error:', error);
        res.status(500).json({ error: 'Failed to fetch borrowing history' });
    }
};

// Fetch all borrow records (Admin/Librarian)
const fetchAllBorrowRecords = async (req, res) => {
    try {
        const { status, studentId, bookId, page = 1, limit = 50 } = req.query;

        let query = {};

        if (status) {
            query.status = status;
        }

        if (studentId) {
            query.student = studentId;
        }

        if (bookId) {
            query.book = bookId;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const records = await BorrowRecord.find(query)
            .populate('student')
            .populate('book')
            .populate('processedBy')
            .sort({ borrowDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await BorrowRecord.countDocuments(query);

        res.status(200).json({
            records,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Fetch borrow records error:', error);
        res.status(500).json({ error: 'Failed to fetch borrow records' });
    }
};

// ============================================
// FINE MANAGEMENT
// ============================================

// Fetch student's fines
const fetchStudentFines = async (req, res) => {
    try {
        const studentId = req.student._id;

        const fines = await Fine.find({ student: studentId })
            .populate('borrowRecord')
            .populate({
                path: 'borrowRecord',
                populate: { path: 'book' }
            })
            .sort({ createdAt: -1 });

        // Calculate total pending fines
        const totalPending = fines
            .filter(f => f.status === 'pending')
            .reduce((sum, f) => sum + f.amount, 0);

        res.status(200).json({
            fines,
            totalPending
        });
    } catch (error) {
        console.error('Fetch student fines error:', error);
        res.status(500).json({ error: 'Failed to fetch fines' });
    }
};

// Fetch all fines (Admin/Librarian)
const fetchAllFines = async (req, res) => {
    try {
        const { status, studentId, page = 1, limit = 50 } = req.query;

        let query = {};

        if (status) {
            query.status = status;
        }

        if (studentId) {
            query.student = studentId;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const fines = await Fine.find(query)
            .populate('student')
            .populate('borrowRecord')
            .populate({
                path: 'borrowRecord',
                populate: { path: 'book' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Fine.countDocuments(query);

        res.status(200).json({
            fines,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Fetch fines error:', error);
        res.status(500).json({ error: 'Failed to fetch fines' });
    }
};

// Record fine payment
const payFine = async (req, res) => {
    try {
        const { fineId } = req.params;
        const { amount } = req.body;

        const fine = await Fine.findById(fineId);

        if (!fine) {
            return res.status(404).json({ error: 'Fine not found' });
        }

        if (fine.status === 'paid') {
            return res.status(400).json({ error: 'Fine already paid' });
        }

        fine.status = 'paid';
        fine.paidDate = new Date();
        fine.paidAmount = amount || fine.amount;
        await fine.save();

        res.status(200).json({
            success: 'Fine payment recorded successfully',
            fine
        });
    } catch (error) {
        console.error('Pay fine error:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
};

// Waive fine
const waiveFine = async (req, res) => {
    try {
        const { fineId } = req.params;
        const { reason } = req.body;
        const waivedBy = req.user._id;

        const fine = await Fine.findById(fineId);

        if (!fine) {
            return res.status(404).json({ error: 'Fine not found' });
        }

        if (fine.status !== 'pending') {
            return res.status(400).json({ error: 'Can only waive pending fines' });
        }

        fine.status = 'waived';
        fine.waivedBy = waivedBy;
        fine.waivedReason = reason;
        await fine.save();

        res.status(200).json({
            success: 'Fine waived successfully',
            fine
        });
    } catch (error) {
        console.error('Waive fine error:', error);
        res.status(500).json({ error: 'Failed to waive fine' });
    }
};

// ============================================
// RESERVATION MANAGEMENT
// ============================================

// Reserve a book
const reserveBook = async (req, res) => {
    try {
        const { bookId } = req.params;
        const studentId = req.student._id;

        const settings = await getSettings();

        // Check if book exists
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check if book is available (no need to reserve if available)
        if (book.availableCopies > 0) {
            return res.status(400).json({
                error: 'Book is available for borrowing. No need to reserve.'
            });
        }

        // Check if student already has active reservation for this book
        const existingReservation = await Reservation.findOne({
            student: studentId,
            book: bookId,
            status: 'active'
        });

        if (existingReservation) {
            return res.status(400).json({
                error: 'You already have an active reservation for this book'
            });
        }

        // Create reservation
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + settings.reservationExpiryDays);

        const reservation = await Reservation.create({
            student: studentId,
            book: bookId,
            expiryDate,
            status: 'active'
        });

        const populatedReservation = await Reservation.findById(reservation._id)
            .populate('book')
            .populate({
                path: 'book',
                populate: { path: 'category' }
            });

        res.status(201).json({
            success: 'Book reserved successfully',
            reservation: populatedReservation
        });
    } catch (error) {
        console.error('Reserve book error:', error);
        res.status(500).json({ error: 'Failed to reserve book' });
    }
};

// Cancel reservation
const cancelReservation = async (req, res) => {
    try {
        const { reservationId } = req.params;
        const studentId = req.student._id;

        const reservation = await Reservation.findOne({
            _id: reservationId,
            student: studentId
        });

        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        if (reservation.status !== 'active') {
            return res.status(400).json({ error: 'Can only cancel active reservations' });
        }

        reservation.status = 'cancelled';
        await reservation.save();

        res.status(200).json({
            success: 'Reservation cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel reservation error:', error);
        res.status(500).json({ error: 'Failed to cancel reservation' });
    }
};

// Fetch student's reservations
const fetchStudentReservations = async (req, res) => {
    try {
        const studentId = req.student._id;

        const reservations = await Reservation.find({ student: studentId })
            .populate('book')
            .populate({
                path: 'book',
                populate: { path: 'category' }
            })
            .sort({ reservationDate: -1 });

        res.status(200).json({ reservations });
    } catch (error) {
        console.error('Fetch reservations error:', error);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
};

// Fetch all reservations (Admin/Librarian)
const fetchAllReservations = async (req, res) => {
    try {
        const { status, bookId, page = 1, limit = 50 } = req.query;

        let query = {};

        if (status) {
            query.status = status;
        }

        if (bookId) {
            query.book = bookId;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reservations = await Reservation.find(query)
            .populate('student')
            .populate('book')
            .sort({ reservationDate: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Reservation.countDocuments(query);

        res.status(200).json({
            reservations,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Fetch reservations error:', error);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
};

// Fulfill reservation
const fulfillReservation = async (req, res) => {
    try {
        const { reservationId } = req.params;

        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        if (reservation.status !== 'active') {
            return res.status(400).json({ error: 'Can only fulfill active reservations' });
        }

        reservation.status = 'fulfilled';
        reservation.notified = true;
        await reservation.save();

        res.status(200).json({
            success: 'Reservation fulfilled successfully',
            reservation
        });
    } catch (error) {
        console.error('Fulfill reservation error:', error);
        res.status(500).json({ error: 'Failed to fulfill reservation' });
    }
};

// ============================================
// SETTINGS & ANALYTICS
// ============================================

// Get library settings
const getLibrarySettings = async (req, res) => {
    try {
        const settings = await getSettings();
        res.status(200).json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

// Update library settings
const updateLibrarySettings = async (req, res) => {
    try {
        const updateData = req.body;

        let settings = await LibrarySettings.findOne();

        if (!settings) {
            settings = await LibrarySettings.create(updateData);
        } else {
            Object.assign(settings, updateData);
            await settings.save();
        }

        res.status(200).json({
            success: 'Settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// Get library analytics
const getLibraryAnalytics = async (req, res) => {
    try {
        // Total books
        const totalBooks = await Book.countDocuments({ status: 'active' });

        // Currently borrowed
        const currentlyBorrowed = await BorrowRecord.countDocuments({
            status: { $in: ['borrowed', 'overdue'] }
        });

        // Overdue books
        const overdueBooks = await BorrowRecord.countDocuments({
            status: 'overdue'
        });

        // Total fines collected
        const finesCollected = await Fine.aggregate([
            { $match: { status: 'paid' } },
            { $group: { _id: null, total: { $sum: '$paidAmount' } } }
        ]);

        const totalFinesCollected = finesCollected.length > 0 ? finesCollected[0].total : 0;

        // Pending fines
        const pendingFines = await Fine.aggregate([
            { $match: { status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalPendingFines = pendingFines.length > 0 ? pendingFines[0].total : 0;

        // Active reservations
        const activeReservations = await Reservation.countDocuments({ status: 'active' });

        // Most borrowed books (top 10)
        const popularBooks = await BorrowRecord.aggregate([
            { $group: { _id: '$book', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'books',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'bookDetails'
                }
            },
            { $unwind: '$bookDetails' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'bookDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    borrowCount: '$count',
                    title: '$bookDetails.title',
                    author: '$bookDetails.author',
                    category: '$categoryDetails'
                }
            }
        ]);

        // Category distribution
        const categoryDistribution = await Book.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' }
        ]);

        // Borrowing trends (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const borrowingTrends = await BorrowRecord.aggregate([
            { $match: { borrowDate: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$borrowDate' },
                        month: { $month: '$borrowDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.status(200).json({
            analytics: {
                totalBooks,
                currentlyBorrowed,
                overdueBooks,
                totalFinesCollected,
                totalPendingFines,
                activeReservations,
                popularBooks,
                categoryDistribution,
                borrowingTrends
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

module.exports = {
    // Book management
    fetchBooks,
    fetchBookById,
    addBook,
    updateBook,
    deleteBook,
    uploadBookCover,

    // Category management
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,

    // Borrowing operations
    borrowBook,
    returnBook,
    renewBook,
    fetchBorrowedBooks,
    fetchBorrowingHistory,
    fetchAllBorrowRecords,

    // Fine management
    fetchStudentFines,
    fetchAllFines,
    payFine,
    waiveFine,

    // Reservation management
    reserveBook,
    cancelReservation,
    fetchStudentReservations,
    fetchAllReservations,
    fulfillReservation,

    // Settings & Analytics
    getLibrarySettings,
    updateLibrarySettings,
    getLibraryAnalytics
};
