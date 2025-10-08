import { createApi } from 'unsplash-js';
import { env } from '../config/env.js';

class UnsplashService {
  private unsplash: any;

  constructor() {
    this.unsplash = createApi({
      accessKey: env.unsplash.accessKey,
      // We don't need the secret for client-side operations
    });
  }

  async searchPhotos(query: string, page: number = 1, perPage: number = 20) {
    try {
      const result = await this.unsplash.search.getPhotos({
        query,
        page,
        perPage,
        orientation: 'landscape',
      });

      if (result.errors) {
        console.error('Unsplash API errors:', result.errors);
        throw new Error('Failed to fetch images from Unsplash');
      }

      return {
        results: result.response?.results || [],
        total: result.response?.total || 0,
        totalPages: result.response?.total_pages || 0,
      };
    } catch (error) {
      console.error('Unsplash service error:', error);
      throw new Error('Failed to search images');
    }
  }

  async getPhoto(photoId: string) {
    try {
      const result = await this.unsplash.photos.get({ photoId });

      if (result.errors) {
        console.error('Unsplash API errors:', result.errors);
        throw new Error('Failed to fetch photo from Unsplash');
      }

      return result.response;
    } catch (error) {
      console.error('Unsplash service error:', error);
      throw new Error('Failed to get photo');
    }
  }

  async trackDownload(downloadUrl: string) {
    try {
      // Track download for API compliance
      await fetch(downloadUrl, {
        headers: {
          'Authorization': `Client-ID ${env.unsplash.accessKey}`,
        }
      });
    } catch (error) {
      console.error('Error tracking download:', error);
      // Don't throw error, this is just for tracking
    }
  }

  // Get popular categories
  getCategories() {
    return [
      'technology', 'business', 'nature', 'people', 'architecture', 
      'food', 'travel', 'abstract', 'minimal', 'lifestyle',
      'coffee', 'work', 'creative', 'design', 'office'
    ];
  }
}

export const unsplashService = new UnsplashService();
