/**
 * Cross-Domain Authentication Utility
 * Enables authentication sharing between subdomains (cs.labapps.io, portal.labapps.io, etc.)
 */

class CrossDomainAuth {
    constructor() {
        this.storageKey = 'labapps_auth_data';
        this.iframeId = 'labapps-auth-iframe';
        this.ready = false;
        this.init();
    }

    /**
     * Initialize cross-domain authentication
     */
    init() {
        this.createStorageIframe();
        this.setupMessageListener();
        this.ready = true;
    }

    /**
     * Create a hidden iframe for cross-domain storage
     */
    createStorageIframe() {
        // Check if iframe already exists
        if (document.getElementById(this.iframeId)) {
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.id = this.iframeId;
        iframe.style.display = 'none';
        iframe.src = this.getStorageUrl();
        
        // Handle iframe load errors gracefully (404s won't trigger onerror, but we suppress console errors)
        iframe.onerror = () => {
            console.warn('Cross-domain storage iframe could not be loaded. Continuing with local storage fallback.');
        };
        
        // Suppress 404 errors in console for missing storage.html
        // The iframe will fail silently and we'll use localStorage fallback
        iframe.onload = () => {
            // Iframe loaded successfully - storage.html exists
        };
        
        document.body.appendChild(iframe);
    }

    /**
     * Get the storage URL for the iframe
     */
    getStorageUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost') {
            return `${protocol}//localhost:3000/storage.html`;
        } else {
            return `${protocol}//labapps.io/storage.html`;
        }
    }

    /**
     * Setup message listener for cross-domain communication
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            // Verify origin for security
            if (!this.isValidOrigin(event.origin)) {
                return;
            }

            const { type, data } = event.data;
            
            switch (type) {
                case 'STORAGE_READY':
                    this.ready = true;
                    break;
                case 'AUTH_DATA_RESPONSE':
                    this.handleAuthDataResponse(data);
                    break;
                case 'AUTH_DATA_UPDATED':
                    this.handleAuthDataUpdated(data);
                    break;
            }
        });
    }

    /**
     * Check if the origin is valid for cross-domain communication
     */
    isValidOrigin(origin) {
        const validOrigins = [
            'http://localhost:3000',
            'https://labapps.io',
            'http://labapps.io'
        ];
        return validOrigins.includes(origin);
    }

    /**
     * Store authentication data across all subdomains
     */
    async storeAuthData(authData) {
        // Store in local localStorage as fallback
        this.storeLocalAuthData(authData);
        
        // Store in cross-domain storage
        this.sendMessageToStorage('STORE_AUTH_DATA', authData);
        
        // Also store in sessionStorage for immediate access
        sessionStorage.setItem(this.storageKey, JSON.stringify(authData));
    }

    /**
     * Retrieve authentication data from cross-domain storage
     */
    async getAuthData() {
        // First check sessionStorage for immediate access
        const sessionData = sessionStorage.getItem(this.storageKey);
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch (e) {
                console.warn('Failed to parse session auth data:', e);
            }
        }

        // Check localStorage as fallback
        const localData = this.getLocalAuthData();
        if (localData && this.isValidAuthData(localData)) {
            return localData;
        }

        // Request from cross-domain storage
        return new Promise((resolve) => {
            this.pendingAuthRequest = resolve;
            this.sendMessageToStorage('GET_AUTH_DATA', null);
            
            // Timeout after 2 seconds
            setTimeout(() => {
                if (this.pendingAuthRequest) {
                    this.pendingAuthRequest = null;
                    resolve(null);
                }
            }, 2000);
        });
    }

    /**
     * Clear authentication data from all storage locations
     */
    async clearAuthData() {
        // Clear from all storage locations
        localStorage.removeItem('userToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('displayName');
        localStorage.removeItem('emailAddress');
        localStorage.removeItem('orgId');
        localStorage.removeItem('userImage');
        localStorage.removeItem('userTimezone');
        localStorage.removeItem('appversion');
        localStorage.removeItem('profileimage');
        
        sessionStorage.removeItem(this.storageKey);
        
        // Clear from cross-domain storage
        this.sendMessageToStorage('CLEAR_AUTH_DATA', null);
    }

    /**
     * Store authentication data in localStorage (fallback method)
     */
    storeLocalAuthData(authData) {
        if (!authData) return;
        
        Object.keys(authData).forEach(key => {
            if (authData[key] !== null && authData[key] !== undefined) {
                localStorage.setItem(key, authData[key]);
            }
        });
    }

    /**
     * Get authentication data from localStorage (fallback method)
     */
    getLocalAuthData() {
        const authData = {
            userToken: localStorage.getItem('userToken'),
            userId: localStorage.getItem('userId'),
            displayName: localStorage.getItem('displayName'),
            emailAddress: localStorage.getItem('emailAddress'),
            orgId: localStorage.getItem('orgId'),
            userImage: localStorage.getItem('userImage'),
            userTimezone: localStorage.getItem('userTimezone'),
            appversion: localStorage.getItem('appversion'),
            profileimage: localStorage.getItem('profileimage')
        };
        
        return this.isValidAuthData(authData) ? authData : null;
    }

    /**
     * Check if authentication data is valid
     */
    isValidAuthData(authData) {
        return authData && 
               authData.userToken && 
               authData.userId && 
               authData.displayName;
    }

    /**
     * Send message to storage iframe
     */
    sendMessageToStorage(type, data) {
        const iframe = document.getElementById(this.iframeId);
        if (iframe && iframe.contentWindow) {
            // Get the target origin (just the domain, not the full URL)
            const targetOrigin = this.getTargetOrigin();
            iframe.contentWindow.postMessage({
                type: type,
                data: data
            }, targetOrigin);
        }
    }
    
    /**
     * Get the target origin for postMessage
     */
    getTargetOrigin() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost') {
            return `${protocol}//localhost:3000`;
        } else {
            return `${protocol}//labapps.io`;
        }
    }

    /**
     * Handle response from storage iframe
     */
    handleAuthDataResponse(data) {
        if (this.pendingAuthRequest) {
            this.pendingAuthRequest(data);
            this.pendingAuthRequest = null;
        }
    }

    /**
     * Handle auth data updates from other subdomains
     */
    handleAuthDataUpdated(data) {
        if (data && this.isValidAuthData(data)) {
            // Update local storage
            this.storeLocalAuthData(data);
            // Update session storage
            sessionStorage.setItem(this.storageKey, JSON.stringify(data));
            
            // Trigger auth state change event
            window.dispatchEvent(new CustomEvent('authStateChanged', { 
                detail: { authData: data, source: 'cross-domain' } 
            }));
        }
    }

    /**
     * Check if user is authenticated across domains
     */
    async isAuthenticated() {
        const authData = await this.getAuthData();
        return this.isValidAuthData(authData);
    }

    /**
     * Get current authentication token
     */
    async getAuthToken() {
        const authData = await this.getAuthData();
        return authData ? authData.userToken : null;
    }

    /**
     * Sync authentication data from URL parameters (for direct navigation)
     */
    syncFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const authToken = urlParams.get('auth_token');
        const userId = urlParams.get('user_id');
        const displayName = urlParams.get('display_name');
        const emailAddress = urlParams.get('email_address');
        const orgId = urlParams.get('org_id');

        if (authToken && userId && displayName) {
            const authData = {
                userToken: authToken,
                userId: userId,
                displayName: decodeURIComponent(displayName),
                emailAddress: emailAddress ? decodeURIComponent(emailAddress) : '',
                orgId: orgId || '',
                userImage: urlParams.get('user_image') || '',
                userTimezone: urlParams.get('user_timezone') || '',
                appversion: urlParams.get('app_version') || '',
                profileimage: urlParams.get('profile_image') || ''
            };

            this.storeAuthData(authData);
            
            // Clean up URL parameters
            this.cleanUrl();
            
            return true;
        }
        
        return false;
    }

    /**
     * Clean authentication parameters from URL
     */
    cleanUrl() {
        const url = new URL(window.location);
        const paramsToRemove = [
            'auth_token', 'user_id', 'display_name', 'email_address', 
            'org_id', 'user_image', 'user_timezone', 'app_version', 'profile_image'
        ];
        
        paramsToRemove.forEach(param => url.searchParams.delete(param));
        
        // Update URL without page reload
        window.history.replaceState({}, '', url.toString());
    }

    /**
     * Generate URL with authentication parameters for cross-domain navigation
     */
    generateAuthUrl(targetUrl, authData) {
        if (!this.isValidAuthData(authData)) {
            return targetUrl;
        }

        const url = new URL(targetUrl);
        url.searchParams.set('auth_token', authData.userToken);
        url.searchParams.set('user_id', authData.userId);
        url.searchParams.set('display_name', encodeURIComponent(authData.displayName));
        url.searchParams.set('email_address', encodeURIComponent(authData.emailAddress || ''));
        url.searchParams.set('org_id', authData.orgId || '');
        url.searchParams.set('user_image', authData.userImage || '');
        url.searchParams.set('user_timezone', authData.userTimezone || '');
        url.searchParams.set('app_version', authData.appversion || '');
        url.searchParams.set('profile_image', authData.profileimage || '');

        return url.toString();
    }
}

// Create global instance
window.crossDomainAuth = new CrossDomainAuth();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrossDomainAuth;
}
