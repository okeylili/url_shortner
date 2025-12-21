/**
 * URL Shortener - Frontend JavaScript
 * Handles client-side interactions and API calls
 */

// Utility Functions
// ==========================================

/**
 * Format a date to a readable string
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Format a number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboardAsync(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add animation styles
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// API Functions
// ==========================================

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Request failed');
        }
        
        return await response.json();
    } catch (error) {
        throw error;
    }
}

/**
 * Shorten a URL
 * @param {string} originalUrl - The URL to shorten
 * @param {string} customCode - Optional custom code
 * @returns {Promise<object>} Short URL data
 */
async function shortenUrl(originalUrl, customCode = null) {
    const payload = { original_url: originalUrl };
    if (customCode) {
        payload.custom_code = customCode;
    }
    
    return await apiRequest('/api/shorten', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

/**
 * Get URL analytics
 * @param {string} shortCode - Short code to get analytics for
 * @returns {Promise<object>} Analytics data
 */
async function getAnalytics(shortCode) {
    return await apiRequest(`/api/analytics/${shortCode}`);
}

/**
 * Get all URLs
 * @param {number} skip - Number to skip
 * @param {number} limit - Number to return
 * @returns {Promise<Array>} List of URLs
 */
async function getAllUrls(skip = 0, limit = 100) {
    return await apiRequest(`/api/urls?skip=${skip}&limit=${limit}`);
}

/**
 * Delete a URL
 * @param {string} shortCode - Short code to delete
 * @returns {Promise<object>} Response
 */
async function deleteUrl(shortCode) {
    return await apiRequest(`/api/url/${shortCode}`, {
        method: 'DELETE'
    });
}

/**
 * Toggle URL status
 * @param {string} shortCode - Short code to toggle
 * @returns {Promise<object>} Response
 */
async function toggleUrlStatus(shortCode) {
    return await apiRequest(`/api/url/${shortCode}/toggle`, {
        method: 'PUT'
    });
}

/**
 * Get global statistics
 * @returns {Promise<object>} Global stats
 */
async function getGlobalStats() {
    return await apiRequest('/api/stats');
}

// URL Validation
// ==========================================

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Is valid
 */
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate custom code
 * @param {string} code - Code to validate
 * @returns {boolean} Is valid
 */
function isValidCustomCode(code) {
    return /^[a-zA-Z0-9_-]+$/.test(code) && code.length >= 3 && code.length <= 20;
}

// Loading States
// ==========================================

/**
 * Show loading state on a button
 * @param {HTMLElement} button - Button element
 * @param {boolean} isLoading - Loading state
 */
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `
            <svg class="animate-spin" style="width: 20px; height: 20px; display: inline;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
        `;
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Submit';
    }
}

// QR Code Generation (Optional)
// ==========================================

/**
 * Generate QR code for a URL
 * @param {string} url - URL to generate QR code for
 * @returns {string} QR code data URL
 */
function generateQRCode(url) {
    // This would require a QR code library like qrcode.js
    // For now, we'll use a public API
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
}

// Local Storage Utilities
// ==========================================

/**
 * Save data to local storage
 * @param {string} key - Storage key
 * @param {any} data - Data to save
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to storage:', error);
    }
}

/**
 * Load data from local storage
 * @param {string} key - Storage key
 * @returns {any} Stored data
 */
function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to load from storage:', error);
        return null;
    }
}

/**
 * Remove data from local storage
 * @param {string} key - Storage key
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to remove from storage:', error);
    }
}

// Recent URLs Management
// ==========================================

/**
 * Add URL to recent list
 * @param {object} urlData - URL data
 */
function addToRecentUrls(urlData) {
    let recent = loadFromStorage('recentUrls') || [];
    
    // Remove duplicates
    recent = recent.filter(url => url.short_code !== urlData.short_code);
    
    // Add to beginning
    recent.unshift(urlData);
    
    // Keep only last 10
    recent = recent.slice(0, 10);
    
    saveToStorage('recentUrls', recent);
}

/**
 * Get recent URLs
 * @returns {Array} Recent URLs
 */
function getRecentUrls() {
    return loadFromStorage('recentUrls') || [];
}

// URL Shortening Helper
// ==========================================

/**
 * Extract domain from URL
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url;
    }
}

/**
 * Truncate URL for display
 * @param {string} url - URL to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated URL
 */
function truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
}

// Export functions for use in HTML files
window.urlShortenerUtils = {
    formatDate,
    formatNumber,
    copyToClipboardAsync,
    showNotification,
    apiRequest,
    shortenUrl,
    getAnalytics,
    getAllUrls,
    deleteUrl,
    toggleUrlStatus,
    getGlobalStats,
    isValidUrl,
    isValidCustomCode,
    setButtonLoading,
    generateQRCode,
    saveToStorage,
    loadFromStorage,
    removeFromStorage,
    addToRecentUrls,
    getRecentUrls,
    extractDomain,
    truncateUrl
};

console.log('URL Shortener utilities loaded successfully');