export const UploadsController = {
    uploadImage: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: {
                        message: 'No image file provided',
                        code: 'NO_FILE'
                    }
                });
            }
            // Return the file path relative to public directory
            const filePath = `/assets/blog-images/${req.file.filename}`;
            return res.json({
                success: true,
                filePath,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });
        }
        catch (error) {
            console.error('Upload error:', error);
            return res.status(500).json({
                error: {
                    message: 'Failed to upload image',
                    code: 'UPLOAD_ERROR'
                }
            });
        }
    },
    uploadMultipleImages: async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    error: {
                        message: 'No image files provided',
                        code: 'NO_FILES'
                    }
                });
            }
            const files = req.files;
            const uploadedFiles = files.map(file => ({
                filePath: `/assets/blog-images/${file.filename}`,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            }));
            return res.json({
                success: true,
                files: uploadedFiles
            });
        }
        catch (error) {
            console.error('Upload error:', error);
            return res.status(500).json({
                error: {
                    message: 'Failed to upload images',
                    code: 'UPLOAD_ERROR'
                }
            });
        }
    }
};
