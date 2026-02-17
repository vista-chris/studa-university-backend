const File = require('../models/file-model');
const fs = require('fs');
const path = require('path');

const listFiles = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { parentId, filter } = req.query;
        let query = { ownerId: res.locals.user._id };

        if (filter === 'recent') {
            query.isInTrash = false;
        } else if (filter === 'starred') {
            query.isStarred = true;
            query.isInTrash = false;
        } else if (filter === 'trash') {
            query.isInTrash = true;
        } else {
            query.parentId = parentId || 'root';
            query.isInTrash = false;
        }

        let files = await File.find(query).sort({ type: 1, name: 1 });

        if (filter === 'recent') {
            files = files.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20);
        }

        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const uploadFile = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { parentId } = req.body;
        const filename = req.file.originalname;
        const ext = filename.split('.').pop().toLowerCase();

        let type = 'file';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) type = 'image';
        else if (['pdf'].includes(ext)) type = 'pdf';
        else if (['txt', 'md'].includes(ext)) type = 'text';
        else if (['xlsx', 'csv'].includes(ext)) type = 'excel';

        const newFile = new File({
            name: filename,
            type: type,
            size: req.file.size,
            parentId: parentId || 'root',
            ownerId: res.locals.user._id,
            path: '/assets/uploads/' + req.file.filename
        });

        await newFile.save();
        res.json(newFile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const createFolder = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, parentId } = req.body;
        const newFolder = new File({
            name: name,
            type: 'folder',
            parentId: parentId || 'root',
            ownerId: res.locals.user._id
        });

        await newFolder.save();
        res.json(newFolder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const renameItem = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id, name } = req.body;
        const file = await File.findOneAndUpdate(
            { _id: id, ownerId: res.locals.user._id },
            { name: name },
            { new: true }
        );
        res.json(file);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteItem = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { ids, permanent } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'IDs array required' });
        }

        const results = [];
        for (const id of ids) {
            const file = await File.findOne({ _id: id, ownerId: res.locals.user._id });
            if (!file) continue;

            if (permanent === true || permanent === 'true' || file.isInTrash) {
                if (file.type !== 'folder' && file.path) {
                    const fullPath = path.join(__dirname, '../public', file.path);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                }
                await File.findByIdAndDelete(id);
                results.push({ id, status: 'deleted' });
            } else {
                file.isInTrash = true;
                await file.save();
                results.push({ id, status: 'trashed' });
            }
        }
        res.json({ message: 'Operation completed', results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const getFolderInfo = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        if (id === 'root') {
            return res.json({ name: 'My Files' });
        }
        const folder = await File.findOne({ _id: id, ownerId: res.locals.user._id, type: 'folder' });
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
        res.json(folder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const toggleStar = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { id, isStarred } = req.body;
        const file = await File.findOneAndUpdate(
            { _id: id, ownerId: res.locals.user._id },
            { isStarred: isStarred },
            { new: true }
        );
        if (!file) return res.status(404).json({ error: 'Item not found' });
        res.json(file);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const pasteItems = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { action, ids, targetParentId } = req.body;
        const ownerId = res.locals.user._id;

        if (action === 'move') {
            await File.updateMany(
                { _id: { $in: ids }, ownerId },
                { $set: { parentId: targetParentId || 'root' } }
            );
            return res.json({ success: true, message: 'Items moved' });
        }

        if (action === 'copy') {
            const results = [];
            for (const id of ids) {
                const file = await File.findOne({ _id: id, ownerId });
                if (!file) continue;

                if (file.type === 'folder') {
                    const newFolder = new File({
                        name: `${file.name} (Copy)`,
                        type: 'folder',
                        parentId: targetParentId || 'root',
                        ownerId
                    });
                    await newFolder.save();
                    results.push(newFolder);
                } else {
                    const newFilename = `${Date.now()}_copy_${path.basename(file.path)}`;
                    const oldPath = path.join(__dirname, '../public', file.path);
                    const newPath = path.join(__dirname, '../public/assets/uploads', newFilename);
                    const newRelativePath = '/assets/uploads/' + newFilename;

                    if (fs.existsSync(oldPath)) {
                        fs.copyFileSync(oldPath, newPath);
                        const newFile = new File({
                            name: `${file.name} (Copy)`,
                            type: file.type,
                            size: file.size,
                            parentId: targetParentId || 'root',
                            ownerId,
                            path: newRelativePath
                        });
                        await newFile.save();
                        results.push(newFile);
                    }
                }
            }
            return res.json({ success: true, message: 'Items copied', results });
        }

        res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        console.error('Paste error:', err);
        res.status(500).json({ error: 'Server error during paste' });
    }
};

const restoreItems = async (req, res) => {
    try {
        if (!res.locals.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: 'IDs array required' });
        }

        await File.updateMany(
            { _id: { $in: ids }, ownerId: res.locals.user._id },
            { $set: { isInTrash: false } }
        );

        res.json({ success: true, message: 'Items restored' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during restore' });
    }
};

module.exports = {
    listFiles,
    uploadFile,
    createFolder,
    renameItem,
    deleteItem,
    getFolderInfo,
    toggleStar,
    pasteItems,
    restoreItems
};
