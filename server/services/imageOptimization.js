/**
 * Image Optimization Service
 * Handles automatic resizing, compression, and lazy loading
 */

const axios = require("axios");

class ImageOptimizationService {
  constructor() {
    this.cloudinaryBaseUrl = "https://res.cloudinary.com";
  }

  /**
   * Generate optimized Cloudinary URL based on image position/context
   * Positions: hero, thumbnail, card, nav, footer
   */
  getOptimizedImageUrl(cloudinaryUrl, position = "card", format = "auto") {
    if (!cloudinaryUrl) return null;

    // Extract public_id from Cloudinary URL
    const publicId = this.extractPublicId(cloudinaryUrl);
    if (!publicId) return cloudinaryUrl;

    const optimizations = {
      hero: {
        width: 1920,
        height: 1080,
        quality: "auto",
        fetch_format: format,
        crop: "fill",
        gravity: "auto"
      },
      card: {
        width: 400,
        height: 300,
        quality: "auto",
        fetch_format: format,
        crop: "fill",
        gravity: "center"
      },
      thumbnail: {
        width: 200,
        height: 150,
        quality: "auto",
        fetch_format: format,
        crop: "fill",
        gravity: "center"
      },
      nav: {
        width: 150,
        height: 50,
        quality: "auto",
        fetch_format: format,
        crop: "fit"
      },
      logo: {
        width: 100,
        height: 100,
        quality: "auto",
        fetch_format: format,
        crop: "fit",
        background: "auto"
      },
      footer: {
        width: 120,
        height: 40,
        quality: "auto",
        fetch_format: format,
        crop: "fit"
      }
    };

    const opt = optimizations[position] || optimizations.card;

    return this.buildCloudinaryUrl(publicId, opt);
  }

  /**
   * Get responsive image URLs for srcset
   * Used for: <img srcset="small 480w, medium 768w, large 1200w" />
   */
  getResponsiveImageUrls(cloudinaryUrl, position = "card") {
    if (!cloudinaryUrl) return null;

    const publicId = this.extractPublicId(cloudinaryUrl);
    if (!publicId) return null;

    const responsiveSizes = {
      hero: [
        { size: 480, width: 480, height: 270 },
        { size: 768, width: 768, height: 432 },
        { size: 1200, width: 1200, height: 675 },
        { size: 1920, width: 1920, height: 1080 }
      ],
      card: [
        { size: 300, width: 300, height: 225 },
        { size: 400, width: 400, height: 300 },
        { size: 600, width: 600, height: 450 }
      ],
      thumbnail: [
        { size: 150, width: 150, height: 112 },
        { size: 200, width: 200, height: 150 },
        { size: 300, width: 300, height: 225 }
      ],
      logo: [
        { size: 50, width: 50, height: 50 },
        { size: 100, width: 100, height: 100 },
        { size: 200, width: 200, height: 200 }
      ]
    };

    const sizes = responsiveSizes[position] || responsiveSizes.card;

    return {
      srcSet: sizes
        .map(s => `${this.buildCloudinaryUrl(publicId, {
          width: s.width,
          height: s.height,
          quality: "auto",
          fetch_format: "auto",
          crop: "fill",
          gravity: "auto"
        })} ${s.size}w`)
        .join(", "),
      src: this.buildCloudinaryUrl(publicId, {
        width: sizes[Math.floor(sizes.length / 2)].width,
        quality: "auto",
        fetch_format: "auto"
      }),
      sizes: this.getSizeAttribute(position)
    };
  }

  /**
   * Get lazyload version (very low quality, blurred placeholder)
   */
  getLazyLoadPlaceholder(cloudinaryUrl) {
    if (!cloudinaryUrl) return null;

    const publicId = this.extractPublicId(cloudinaryUrl);
    if (!publicId) return null;

    return this.buildCloudinaryUrl(publicId, {
      width: 10,
      height: 10,
      quality: 20,
      fetch_format: "auto",
      effect: "blur:300"
    });
  }

  /**
   * Optimize logo specifically
   * Returns: sharp, crisp logo without compression artifacts
   */
  getOptimizedLogo(logoUrl, size = "medium") {
    if (!logoUrl) return null;

    const publicId = this.extractPublicId(logoUrl);
    if (!publicId) return logoUrl;

    const sizes = {
      small: { width: 80, height: 80 },
      medium: { width: 150, height: 150 },
      large: { width: 300, height: 300 },
      xl: { width: 500, height: 500 }
    };

    const s = sizes[size] || sizes.medium;

    return this.buildCloudinaryUrl(publicId, {
      ...s,
      quality: "100", // No compression for logos
      fetch_format: "auto",
      crop: "fit",
      background: "transparent"
    });
  }

  /**
   * Batch optimize multiple images
   */
  batchOptimizeImages(images, position = "card") {
    return images.map(url => ({
      original: url,
      optimized: this.getOptimizedImageUrl(url, position),
      responsive: this.getResponsiveImageUrls(url, position),
      placeholder: this.getLazyLoadPlaceholder(url)
    }));
  }

  /**
   * Build Cloudinary transformation URL
   */
  buildCloudinaryUrl(publicId, transforms) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "doxiqn0ue";

    // Build transformation string
    const params = Object.entries(transforms)
      .map(([key, value]) => `${key}_${value}`)
      .join(",");

    return `https://res.cloudinary.com/${cloudName}/image/upload/${params}/${publicId}`;
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  extractPublicId(url) {
    try {
      // Format: https://res.cloudinary.com/{cloud}/image/upload/{public_id}.{ext}
      const match = url.match(/\/upload\/(?:.*?\/)?(.*?\.[a-z]+)$/i);
      return match ? match[1] : null;
    } catch (error) {
      console.error("Error extracting public ID:", error);
      return null;
    }
  }

  /**
   * Get CSS media queries for responsive images
   */
  getSizeAttribute(position) {
    const sizes = {
      hero: "(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1920px",
      card: "(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw",
      thumbnail: "(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw",
      logo: "100px",
      nav: "80px",
      footer: "100px"
    };

    return sizes[position] || sizes.card;
  }

  /**
   * Generate image srcset for picture element
   */
  getPictureElement(cloudinaryUrl, position = "card", alt = "") {
    const responsive = this.getResponsiveImageUrls(cloudinaryUrl, position);
    if (!responsive) return null;

    return {
      srcSet: responsive.srcSet,
      src: responsive.src,
      sizes: responsive.sizes,
      alt,
      loading: "lazy",
      decoding: "async"
    };
  }

  /**
   * Compress and optimize PDF/document preview images
   */
  getDocumentPreview(cloudinaryUrl, page = 1) {
    if (!cloudinaryUrl) return null;

    const publicId = this.extractPublicId(cloudinaryUrl);
    if (!publicId) return null;

    return this.buildCloudinaryUrl(publicId, {
      width: 600,
      height: 800,
      quality: "auto",
      fetch_format: "jpg",
      page: page,
      crop: "fit"
    });
  }

  /**
   * Get stats on image optimization
   */
  getOptimizationStats(originalUrl, optimizedUrls) {
    // Returns potential savings estimates
    return {
      original: originalUrl,
      optimized: optimizedUrls,
      estimatedSavings: {
        bandwidth: "60-75%",
        loadTime: "50-70%",
        recommendation: "Use responsive srcset for production"
      }
    };
  }
}

module.exports = new ImageOptimizationService();
