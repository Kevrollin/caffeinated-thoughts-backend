import { z } from 'zod';
import { unsplashService } from '../services/unsplash.service.js';
const searchSchema = z.object({
    query: z.string().min(1).max(100),
    page: z.coerce.number().int().min(1).max(100).default(1),
    perPage: z.coerce.number().int().min(1).max(30).default(20),
});
const trackDownloadSchema = z.object({
    downloadUrl: z.string().url(),
});
export const UnsplashController = {
    search: async (req, res) => {
        try {
            const { query, page, perPage } = searchSchema.parse(req.query);
            const result = await unsplashService.searchPhotos(query, page, perPage);
            return res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('Unsplash search error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to search images',
            });
        }
    },
    getPhoto: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Photo ID is required',
                });
            }
            const photo = await unsplashService.getPhoto(id);
            return res.json({
                success: true,
                data: photo,
            });
        }
        catch (error) {
            console.error('Unsplash get photo error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to get photo',
            });
        }
    },
    trackDownload: async (req, res) => {
        try {
            const { downloadUrl } = trackDownloadSchema.parse(req.body);
            await unsplashService.trackDownload(downloadUrl);
            return res.json({
                success: true,
                message: 'Download tracked successfully',
            });
        }
        catch (error) {
            console.error('Unsplash track download error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to track download',
            });
        }
    },
    getCategories: async (req, res) => {
        try {
            const categories = unsplashService.getCategories();
            return res.json({
                success: true,
                data: categories,
            });
        }
        catch (error) {
            console.error('Unsplash get categories error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get categories',
            });
        }
    },
};
