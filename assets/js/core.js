var orgid = localStorage.getItem("orgId");
var userid = localStorage.getItem("userId");
var displayname = (localStorage.getItem('displayName') || '').replace(/^"|"$/g, '');
var apikey = localStorage.getItem("userToken");
var userimage = localStorage.getItem('profileimage')
var usertimezone = localStorage.getItem('userTimezone') || '';
var appversion = '2.7.0'

// Function to refresh timezone from localStorage
function refreshUserTimezone() {
    usertimezone = localStorage.getItem('userTimezone') || '';
}

// Function to refresh API key from localStorage
function refreshApiKey() {
    apikey = localStorage.getItem("userToken");
}

function notifyuser(msgtext, msgtype) {
    butterup.toast({
        message: msgtext,
        type: msgtype,
        location: 'bottom-right'
    });
    butterup.options.maxToasts = 1;
    butterup.options.toastLife = 10000;

}
function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function scrambleEmail(email) {
    // Split the email into username and domain parts
    var atIndex = email.indexOf('@');
    if (atIndex === -1) return email; // Return original email if no '@' found

    var username = email.substring(0, atIndex);
    var domain = email.substring(atIndex);

    // Scramble the username by replacing all but the first few characters with asterisks
    var scrambledUsername = username.charAt(0); // Keep the first character visible
    for (var i = 1; i < username.length - 2; i++) {
        scrambledUsername += '*';
    }
    if (username.length > 3) {
        scrambledUsername += username.slice(-2);
    }

    // Reconstruct the email with the scrambled username and domain
    return scrambledUsername + domain;
}
function redirectuser(redirecturl) {
    $.blockUI();
    setTimeout(function () {
        window.location.replace(redirecturl); // Redirect to dashboard or another page
    }, 3000);
}

function getCurrentDomain() {
    // Get the full URL of the current page
    var url = window.location.href;

    // Extract the protocol (http or https)
    var protocol = window.location.protocol;

    // Extract the hostname (domain name without port number)
    var hostname = window.location.hostname;

    // Combine the protocol and hostname to form the domain
    return protocol + '//' + hostname;
}

function clearLocalStorage() {
    // Clear all items in localStorage
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        localStorage.removeItem(key);
    }
}

function getapiendpoint() {
    if (getCurrentDomain() == "http://localhost" || getCurrentDomain() == "http://saleslocal.labapps.io") {
        return "http://localhost:5258"
    } else {
        return "https://api.labapps.io"
    }
}

/**
 * Extract subdomain from current hostname
 * @returns {string} Subdomain (cs, portal, etc.) or 'cs' as default
 */
function getAppModule() {
    var hostname = window.location.hostname;
    
    // Handle localhost for development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Check if there's a query parameter for appmodule
        var urlParams = new URLSearchParams(window.location.search);
        var appModule = urlParams.get('appmodule');
        return appModule || 'cs'; // Default to 'cs' for localhost
    }
    
    // Extract subdomain from hostname (e.g., cs.labapps.io -> cs)
    var parts = hostname.split('.');
    if (parts.length >= 3) {
        return parts[0].toLowerCase(); // Return first part as subdomain
    }
    
    return 'cs'; // Default fallback
}

/**
 * Load and render dynamic menu from API
 */
/**
 * Generate a unique GUID for cache-busting
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Add cache-busting parameter to URL
 * Handles URLs that may already have query parameters
 */
function addCacheBustingParameter(url, guid) {
    if (!url) return url;
    
    // Check if URL already has query parameters
    var separator = url.indexOf('?') !== -1 ? '&' : '?';
    return url + separator + 'v=' + encodeURIComponent(guid);
}

function loadDynamicMenu() {
    var appmodule = getAppModule();
    var apiEndpoint = getapiendpoint();
    var apiKey = apikey || localStorage.getItem("userToken");
    
    // Generate unique cache-busting GUID for this menu load
    // This ensures all menu links get the latest version without cache
    var cacheBustingGuid = generateGuid();
    
    // Show loading state (optional)
    $('#sidebarMenu').html('<div class="text-center p-4"><i class="ri-loader-4-line spin"></i></div>');
    
    $.ajax({
        url: apiEndpoint + '/api/AppMenus?appmodule=' + encodeURIComponent(appmodule),
        type: 'GET',
        headers: {
            'X-API-KEY': apiKey || ''
        },
        success: function (response) {
            if (!response || !response.sections || response.sections.length === 0) {
                $('#sidebarMenu').html('<div class="text-center p-4 text-muted">No menu items available</div>');
                return;
            }
            
            // Build menu HTML
            var menuHtml = '<div class="nav-group show">';
            
            $.each(response.sections, function (index, section) {
                // Add section label
                menuHtml += '<a href="#" class="nav-label">' + escapeHtml(section.sectionlabel) + '</a>';
                
                // Add menu items for this section
                menuHtml += '<ul class="nav nav-sidebar">';
                
                if (section.items && section.items.length > 0) {
                    $.each(section.items, function (itemIndex, item) {
                        var iconClass = item.menuicon ? escapeHtml(item.menuicon) : 'ri-file-line';
                        var targetWindow = item.targetwindow || '_self';
                        var badgeHtml = '';
                        
                        // Add badge if present
                        if (item.menubadge) {
                            var badgeColor = item.badgecolor || 'badge-primary';
                            badgeHtml = '<span class="badge ' + escapeHtml(badgeColor) + ' ms-auto">' + escapeHtml(item.menubadge) + '</span>';
                        }
                        
                        var additionalCss = item.additionalcss ? ' ' + escapeHtml(item.additionalcss) : '';
                        var dataPageName = item.datapagename ? ' data-pagename="' + escapeHtml(item.datapagename) + '"' : '';
                        
                        // Add cache-busting parameter to menu URL
                        var menuUrl = addCacheBustingParameter(item.menuurl, cacheBustingGuid);
                        
                        menuHtml += '<li class="nav-item">';
                        menuHtml += '<a href="' + escapeHtml(menuUrl) + '" class="nav-link' + additionalCss + '"' + dataPageName + ' target="' + escapeHtml(targetWindow) + '">';
                        menuHtml += '<i class="' + iconClass + '"></i> <span>' + escapeHtml(item.displaytext) + '</span>';
                        if (badgeHtml) {
                            menuHtml += badgeHtml;
                        }
                        menuHtml += '</a>';
                        menuHtml += '</li>';
                    });
                }
                
                menuHtml += '</ul>';
            });
            
            menuHtml += '</div>';
            
            // Inject menu HTML
            $('#sidebarMenu').html(menuHtml);
            
            // Highlight active page
            var currentPageName = getPageName();
            if (currentPageName) {
                $('#sidebarMenu .nav-item .nav-link').removeClass('active');
                $('#sidebarMenu .nav-item .nav-link[data-pagename="' + currentPageName + '"]').addClass('active');
            }
            
            // Initialize collapsible sections
            $('.sidebar .nav-label').on('click', function (e) {
                e.preventDefault();
                var target = $(this).next('.nav-sidebar');
                $(target).slideToggle(function () {
                    // Update perfect scrollbar if present
                    if (typeof psSidebar !== 'undefined') {
                        psSidebar.update();
                    }
                });
            });
            
            // Update perfect scrollbar if present
            if (typeof psSidebar !== 'undefined') {
                psSidebar.update();
            }
        },
        error: function (xhr, status, error) {
            console.error('Error loading menu:', error);
            $('#sidebarMenu').html('<div class="text-center p-4 text-danger">Error loading menu</div>');
        }
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function (m) { return map[m]; });
}

// Function to generate cross-domain URLs with authentication
function generateCrossDomainUrl(targetSubdomain, path = '') {
    // Check if cross-domain auth is available
    if (typeof window.crossDomainAuth === 'undefined') {
        // Fallback to regular URL generation
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost') {
            return `${protocol}//localhost:3000${path}`;
        } else {
            return `${protocol}//${targetSubdomain}.labapps.io${path}`;
        }
    }
    
    // Get current auth data
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
    
    // Generate base URL
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    let baseUrl;
    
    if (hostname === 'localhost') {
        baseUrl = `${protocol}//localhost:3000${path}`;
    } else {
        baseUrl = `${protocol}//${targetSubdomain}.labapps.io${path}`;
    }
    
    // Generate URL with auth parameters
    return window.crossDomainAuth.generateAuthUrl(baseUrl, authData);
}

// Function to navigate to another subdomain with authentication
function navigateToSubdomain(targetSubdomain, path = '') {
    const url = generateCrossDomainUrl(targetSubdomain, path);
    window.location.href = url;
}

function storeUserAttributesInLocalStorage(user) {
    // Ensure we have at least one user with attributes
    if (user && Array.isArray(user) && user.length > 0 && user[0].attributes) {
        const attributes = user[0].attributes;

        for (const key in attributes) {
            if (attributes.hasOwnProperty(key)) {
                localStorage.setItem(key, JSON.stringify(attributes[key]));
            }
        }

    } else {
        console.error("Invalid user data or no attributes found.");
    }
}
function getUserAttributeFromLocalStorage(attributeKey) {
    const attributeValue = localStorage.getItem(attributeKey);
    if (attributeValue !== null) {
        return JSON.parse(attributeValue);
    }
    return null;
}

function generatemodulebasedmenu() {
    var moduleid = localStorage.getItem("moduleid");
    var data = JSON.parse(localStorage.getItem("userdetails"));
    let selectedorg = data[0].organizations.find(org => org.orgid === parseInt(orgid));
    let selectedmodules = selectedorg.modules.filter(module => parseInt(module.moduleid) === parseInt(moduleid));

    if (selectedmodules.length > 0) {
        // Sort the features by featureorder in ascending order
        selectedmodules[0].features.sort((a, b) => a.featureorder - b.featureorder);

        var ttxt = "";
        ttxt += `
                    <div class="nav-group show">
                    <a href="#" class="nav-label">${selectedmodules[0].modulename}</a>
                    <ul class="nav nav-sidebar">
                    
                `;
        $.each(selectedmodules[0].features, function (rec) {

            ttxt += `
                    <li class="nav-item">
                    <a href="${this.defaultpage}" class="nav-link" data-pagename="${getBaseNameWithoutExtension(this.defaultpage)}"><i class="${this.menuicon}"></i> <span>${this.featurename}</span></a>
                    </li>
                `;
        });
        ttxt += `
                    </ul>
                    </div>
                `;
        $('#sidebarMenu').html(ttxt);
        $('#sidebarMenu .nav-item .nav-link').removeClass('active');
        $('[data-pagename="' + getPageName() + '"]').addClass('active');
        $('.sidebar .nav-label').on('click', function (e) {
            e.preventDefault();
            var target = $(this).next('.nav-sidebar');
            $(target).slideToggle(function () {
                psSidebar.update();
            });

        });
    } else {
    }
}

function getPageName() {
    var index = window.location.href.lastIndexOf("/") + 1;
    var filenameWithExtension = window.location.href.substr(index);
    var filename = filenameWithExtension.split(".")[0];
    return filename;
}
function getBaseNameWithoutExtension(url) {
    var parts = url.split('/');

    // Get the last part of the array, which should be the filename
    var filename = parts[parts.length - 1];

    // Split the filename by '.' and take the first part (base name)
    var baseName = filename.split('.')[0];

    return baseName;
}
function modifyuserattributes(userid,attributename,attributevalue) {
    $.ajax({
        type: "POST",
        url: "../assets/ws/auth.aspx/updateuserattributes",
        data: JSON.stringify({ userid: userid, attributename: attributename, attributevalue: attributevalue }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (res) {

        },
        error: function (xhr, status, error) {

        }
    });
}

function addAuditLog(userid, actiontype, actiondescription, entityid, entityname) {
    // Validate required parameters
    if (!userid || !apikey || !getapiendpoint()) {
        console.warn("Audit log skipped: Missing required parameters (userid, apikey, or api endpoint)");
        return;
    }
    
    // Parse userid to integer if it's a string
    var parsedUserId = typeof userid === 'string' ? parseInt(userid) : userid;
    if (isNaN(parsedUserId)) {
        console.warn("Audit log skipped: Invalid userid", userid);
        return;
    }
    
    // Parse entityid - convert 'N/A' or empty string to null, otherwise parse to integer
    var parsedEntityId = null;
    if (entityid && entityid !== 'N/A' && entityid !== '') {
        parsedEntityId = typeof entityid === 'string' ? parseInt(entityid) : entityid;
        if (isNaN(parsedEntityId)) {
            parsedEntityId = null;
        }
    }
    
    // Get client information
    var clientInfo = {
        userid: parsedUserId,
        actiontype: actiontype,
        actiondescription: actiondescription,
        entityid: parsedEntityId,
        entityname: entityname
    };

    // Add timezone information
    try {
        clientInfo.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        clientInfo.timezone = "UTC";
    }

    // Add language information
    clientInfo.language = navigator.language || navigator.userLanguage || "en-US";

    // Add browser and platform information
    clientInfo.browser = getBrowserInfo();
    clientInfo.platform = navigator.platform || "Unknown";

    // Add URL information
    clientInfo.url = window.location.href;
    clientInfo.referrer = document.referrer || "";

    $.ajax({
        type: "POST",
        url: getapiendpoint() + "/api/AppAudits",
        data: JSON.stringify(clientInfo),
        contentType: "application/json; charset=utf-8",
        headers: {
            "X-API-KEY": apikey,
            "X-Timezone": clientInfo.timezone
        },
        success: function (response, textStatus, xhr) {
            // Audit log created successfully (201 Created or 200 OK)
            // Note: API may return 201 with empty body, which is valid
        },
        error: function (xhr, status, error) {
            // Only log actual errors (not 201 Created which is success)
            // 201 Created with empty body may trigger JSON parse error, but it's still success
            if (xhr.status === 201 || xhr.status === 200) {
                // This is actually a success, just with empty response body
                return;
            }
            
            // Log actual errors for debugging but don't show to user
            console.error("Error creating audit log:", {
                actiontype: actiontype,
                status: xhr.status,
                statusText: xhr.statusText,
                error: error,
                responseText: xhr.responseText
            });
        }
    });
}

function getBrowserInfo() {
    var userAgent = navigator.userAgent;
    var browserName = "Unknown";
    
    if (userAgent.indexOf("Chrome") > -1) {
        browserName = "Chrome";
    } else if (userAgent.indexOf("Firefox") > -1) {
        browserName = "Firefox";
    } else if (userAgent.indexOf("Safari") > -1) {
        browserName = "Safari";
    } else if (userAgent.indexOf("Edge") > -1) {
        browserName = "Edge";
    } else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) {
        browserName = "Internet Explorer";
    }
    
    return browserName;
}

// Azure AI Usage Tracking Functions
function logAzureAiUsage(servicename, modelname, operationtype, prompttokens, completiontokens, totaltokens, estimatedcost, success, errormessage, requestbody, responsebody) {
    var clientInfo = getClientInfo();
    var apikey = getUserAttributeFromLocalStorage("usertoken");
    var userid = getUserAttributeFromLocalStorage("userid");
    
    $.ajax({
        type: "POST",
        url: getapiendpoint() + "/api/AzureAiUsage",
        data: JSON.stringify({
            userid: userid,
            servicename: servicename,
            modelname: modelname,
            operationtype: operationtype,
            prompttokens: prompttokens || 0,
            completiontokens: completiontokens || 0,
            totaltokens: totaltokens || 0,
            estimatedcost: estimatedcost || 0,
            success: success !== false,
            errormessage: errormessage || null,
            requestbody: requestbody || null,
            responsebody: responsebody || null
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "X-API-KEY": apikey,
            "X-Timezone": clientInfo.timezone
        },
        success: function (res) {
            // Azure AI usage logged successfully
        },
        error: function (xhr, status, error) {
            // Handle error silently to avoid breaking main functionality
        }
    });
}

// Helper functions for common Azure AI operations
function logChatCompletion(modelname, prompttokens, completiontokens, estimatedcost, success, errormessage, requestbody, responsebody) {
    logAzureAiUsage("Azure OpenAI", modelname, "ChatCompletion", prompttokens, completiontokens, prompttokens + completiontokens, estimatedcost, success, errormessage, requestbody, responsebody);
}

function logTextCompletion(modelname, prompttokens, completiontokens, estimatedcost, success, errormessage, requestbody, responsebody) {
    logAzureAiUsage("Azure OpenAI", modelname, "TextCompletion", prompttokens, completiontokens, prompttokens + completiontokens, estimatedcost, success, errormessage, requestbody, responsebody);
}

function logEmbedding(modelname, totaltokens, estimatedcost, success, errormessage, requestbody, responsebody) {
    logAzureAiUsage("Azure OpenAI", modelname, "Embedding", 0, 0, totaltokens, estimatedcost, success, errormessage, requestbody, responsebody);
}

function getClientInfo() {
    var clientInfo = {};
    
    // Add timezone information
    try {
        clientInfo.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        clientInfo.timezone = "UTC";
    }

    // Add language information
    clientInfo.language = navigator.language || navigator.userLanguage || "en-US";

    // Add browser and platform information
    clientInfo.browser = getBrowserInfo();
    clientInfo.platform = navigator.platform || "Unknown";

    // Add URL information
    clientInfo.url = window.location.href;
    clientInfo.referrer = document.referrer || "";
    
    return clientInfo;
}

function updateUserDisplayName() {
    const displayName = localStorage.getItem('displayname');
    if (displayName) {
        // Remove quotes if they exist and update all spanusername elements
        const cleanDisplayName = displayName.replace(/"/g, '');
        $('.spanusername').html(cleanDisplayName);
    } else {
        // Fallback to userdetails if displayname is not available
        try {
            const userDetails = JSON.parse(localStorage.getItem('userdetails'));
            if (userDetails && userDetails.length > 0 && userDetails[0].attributes) {
                const name = userDetails[0].attributes.displayname || 
                           userDetails[0].attributes.name || 
                           userDetails[0].attributes.firstname + ' ' + userDetails[0].attributes.lastname ||
                           'Unknown User';
                $('.spanusername').html(name.replace(/"/g, ''));
            } else {
                $('.spanusername').html('Unknown User');
            }
        } catch (e) {
            $('.spanusername').html('Unknown User');
        }
    }
}

// Timezone utility functions
function getUserTimezone() {
    // Get user's timezone from localStorage, fallback to browser timezone
    var timezone = localStorage.getItem('userTimezone') || '';
    
    // Debug logging
    //console.log('getUserTimezone - localStorage timezone:', timezone);
    //console.log('getUserTimezone - usertimezone global:', usertimezone);
    
    if (!timezone) {
        // Fallback to browser timezone
        try {
            timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
            timezone = 'UTC';
        }
        
        // Show warning if timezone not set
        notifyuser('Timezone not set, using browser timezone', 'warning');
    }
    
    //console.log('getUserTimezone - final timezone:', timezone);
    return timezone;
}

function formatDateInUserTimezone(dateString, format = 'datetime') {
    if (!dateString) return '';
    
    try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Return original if invalid date
        
        var timezone = getUserTimezone();
        var options = {};
        
        switch (format) {
            case 'date':
                options = { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    timeZone: timezone
                };
                break;
            case 'time':
                options = { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: timezone
                };
                break;
            case 'datetime':
                options = { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: timezone
                };
                break;
            case 'datetime-seconds':
                options = { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: timezone
                };
                break;
            case 'long-date':
                options = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: timezone
                };
                break;
            case 'long-datetime':
                options = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: timezone
                };
                break;
            default:
                options = { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: timezone
                };
        }
        
        return date.toLocaleString('en-US', options);
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateString;
    }
}

function getTimeAgoInUserTimezone(dateString) {
    if (!dateString) return '';
    
    try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        var now = new Date();
        var diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            var minutes = Math.floor(diffInSeconds / 60);
            return minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
        } else if (diffInSeconds < 86400) {
            var hours = Math.floor(diffInSeconds / 3600);
            return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
        } else if (diffInSeconds < 2592000) {
            var days = Math.floor(diffInSeconds / 86400);
            return days + ' day' + (days > 1 ? 's' : '') + ' ago';
        } else {
            // For older dates, show formatted date
            return formatDateInUserTimezone(dateString, 'date');
        }
    } catch (e) {
        console.error('Error calculating time ago:', e);
        return '';
    }
}

function formatDateForDisplay(dateString, context = 'general') {
    if (!dateString) return '';
    
    try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        var now = new Date();
        var diffInSeconds = Math.floor((now - date) / 1000);
        
        // For very recent dates (less than 1 hour), show time ago
        if (diffInSeconds < 3600) {
            return getTimeAgoInUserTimezone(dateString);
        }
        
        // For today, show time
        if (diffInSeconds < 86400) {
            return formatDateInUserTimezone(dateString, 'time');
        }
        
        // For this week, show day and time
        if (diffInSeconds < 604800) {
            var timezone = getUserTimezone();
            var options = { 
                weekday: 'short',
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: timezone
            };
            return date.toLocaleString('en-US', options);
        }
        
        // For older dates, show date based on context
        switch (context) {
            case 'activity':
                return formatDateInUserTimezone(dateString, 'long-datetime');
            case 'user-details':
                return formatDateInUserTimezone(dateString, 'long-date');
            case 'table':
                // For table context, show MM/DD hh:mm a format for older dates
                var timezone = getUserTimezone();
                var options = { 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true,
                    timeZone: timezone
                };
                return date.toLocaleString('en-US', options);
            default:
                return formatDateInUserTimezone(dateString, 'datetime');
        }
    } catch (e) {
        console.error('Error formatting date for display:', e);
        return dateString;
    }
}

/**
 * Get user role from localStorage userdetails or UserAttributes API
 * According to USER_ROLE_PERMISSION_MIGRATION.md, user role is stored in userattributes.userrole
 * @param {boolean} async - If true, returns a Promise. If false, returns synchronously from localStorage only
 * @returns {string|Promise<string>} User role or empty string if not found (or Promise if async=true)
 */
function getUserRole(async) {
    // First try to get from localStorage userdetails
    try {
        var userDetails = JSON.parse(localStorage.getItem('userdetails'));
        if (userDetails && userDetails.length > 0 && userDetails[0].attributes) {
            var userRole = userDetails[0].attributes.userrole;
            if (userRole) {
                return userRole;
            }
        }
    } catch (e) {
        console.error('Error getting user role from userdetails:', e);
    }
    
    // If async is true, fetch from API
    if (async === true) {
        return new Promise(function(resolve) {
            var userId = localStorage.getItem('userId');
            var apiKey = localStorage.getItem('userToken');
            
            if (!userId || !apiKey) {
                resolve('');
                return;
            }
            
            // Try to get from UserAttributes API directly
            $.ajax({
                url: getapiendpoint() + '/api/UserAttributes/user/' + userId + '/attribute/userrole',
                type: 'GET',
                headers: { "X-API-KEY": apiKey },
                success: function(attrData) {
                    if (attrData && attrData.attributevalue) {
                        // Update localStorage userdetails if it exists
                        try {
                            var userDetails = JSON.parse(localStorage.getItem('userdetails'));
                            if (userDetails && userDetails.length > 0) {
                                if (!userDetails[0].attributes) {
                                    userDetails[0].attributes = {};
                                }
                                userDetails[0].attributes.userrole = attrData.attributevalue;
                                localStorage.setItem('userdetails', JSON.stringify(userDetails));
                            }
                        } catch (e) {
                            // Ignore localStorage update errors
                        }
                        resolve(attrData.attributevalue);
                    } else {
                        resolve('');
                    }
                },
                error: function() {
                    // Fallback: try Users API
                    $.ajax({
                        url: getapiendpoint() + '/api/Users?userid=' + userId,
                        type: 'GET',
                        headers: { "X-API-KEY": apiKey },
                        success: function(users) {
                            if (users && users.length > 0 && users[0].attributes && users[0].attributes.userrole) {
                                // Store in localStorage for future use
                                try {
                                    localStorage.setItem('userdetails', JSON.stringify(users));
                                } catch (e) {
                                    // Ignore localStorage errors
                                }
                                resolve(users[0].attributes.userrole);
                            } else {
                                resolve('');
                            }
                        },
                        error: function() {
                            resolve('');
                        }
                    });
                }
            });
        });
    }
    
    // Return empty string if not found synchronously
    return '';
}

/**
 * Get user email from localStorage
 * @returns {string} User email or empty string if not found
 */
function getUserEmail() {
    // Try emailAddress first (from localStorage)
    var email = localStorage.getItem('emailAddress');
    if (email) {
        // Remove quotes if present
        return email.replace(/^"|"$/g, '');
    }
    
    // Fallback to userdetails
    try {
        var userDetails = JSON.parse(localStorage.getItem('userdetails'));
        if (userDetails && userDetails.length > 0 && userDetails[0].attributes) {
            var emailAddress = userDetails[0].attributes.emailaddress || userDetails[0].loginname;
            return emailAddress || '';
        }
    } catch (e) {
        console.error('Error getting user email:', e);
    }
    return '';
}

/**
 * Render user profile dropdown HTML dynamically
 * This function generates the user profile dropdown that can be used across all pages
 * @param {Object} options - Optional configuration object
 * @param {string} options.helpCenterUrl - URL for Help Center link (default: '../kb/knowledgebase.html')
 * @param {string} options.accountSettingsUrl - URL for Account Settings link (default: '../app/userprofile.html')
 * @returns {string} HTML string for the user profile dropdown
 */
function renderUserProfileDropdown(options) {
    options = options || {};
    var helpCenterUrl = options.helpCenterUrl || '../kb/knowledgebase.html';
    var accountSettingsUrl = options.accountSettingsUrl || '../app/userprofile.html';
    
    // Get user data
    var displayName = (localStorage.getItem('displayName') || '').replace(/^"|"$/g, '') || 'Unknown User';
    var userImage = localStorage.getItem('profileimage') || '../assets/img/img1.jpg';
    var userRole = getUserRole() || 'Member';
    var userEmail = getUserEmail() || '';
    
    // Escape HTML to prevent XSS
    displayName = escapeHtml(displayName);
    userImage = escapeHtml(userImage);
    userRole = escapeHtml(userRole);
    userEmail = escapeHtml(userEmail);
    
    // Build the dropdown HTML
    var dropdownHtml = '<div class="dropdown dropdown-profile ms-3 ms-xl-4">';
    dropdownHtml += '<a href="" class="dropdown-link" data-bs-toggle="dropdown" data-bs-auto-close="outside">';
    dropdownHtml += '<div class="avatar online"><img src="' + userImage + '" alt="" class="spanuserimg"></div>';
    dropdownHtml += '</a>';
    dropdownHtml += '<div class="dropdown-menu dropdown-menu-end mt-10-f">';
    dropdownHtml += '<div class="dropdown-menu-body">';
    dropdownHtml += '<div class="avatar avatar-xl online mb-3"><img src="' + userImage + '" alt="" class="spanuserimg"></div>';
    dropdownHtml += '<h5 class="mb-1 text-dark fw-semibold spanusername">' + displayName + '</h5>';
    dropdownHtml += '<p class="fs-sm text-secondary spanuserrole mb-1">' + userRole + '</p>';
    if (userEmail) {
        dropdownHtml += '<p class="fs-sm text-secondary mb-3 spanuseremail"><i class="ri-mail-line me-1"></i>' + userEmail + '</p>';
    } else {
        dropdownHtml += '<p class="fs-sm text-secondary mb-3 spanuseremail" style="display:none;"></p>';
    }
    dropdownHtml += '<nav class="nav">';
    dropdownHtml += '<a target="_blank" href="' + escapeHtml(helpCenterUrl) + '"><i class="ri-question-line"></i> Help Center</a>';
    dropdownHtml += '<a href="' + escapeHtml(accountSettingsUrl) + '"><i class="ri-user-settings-line"></i> Account Settings</a>';
    dropdownHtml += '<a href="#!" onclick="logoutuser();"><i class="ri-logout-box-r-line"></i> Log Out</a>';
    dropdownHtml += '</nav>';
    dropdownHtml += '</div><!-- dropdown-menu-body -->';
    dropdownHtml += '</div><!-- dropdown-menu -->';
    dropdownHtml += '</div><!-- dropdown -->';
    
    return dropdownHtml;
}

/**
 * Initialize and populate user profile dropdown
 * Call this function on page load to populate the dropdown with user data
 * @param {string} containerSelector - CSS selector for the container where dropdown should be rendered (default: '.dropdown-profile')
 * @param {Object} options - Optional configuration object (same as renderUserProfileDropdown)
 */
function initUserProfileDropdown(containerSelector, options) {
    containerSelector = containerSelector || '.dropdown-profile';
    var $container = $(containerSelector);
    
    if ($container.length === 0) {
        console.warn('User profile dropdown container not found:', containerSelector);
        return;
    }
    
    // Replace the container with the dynamically generated dropdown
    var dropdownHtml = renderUserProfileDropdown(options);
    $container.replaceWith(dropdownHtml);
    
    // Update user display name and image (in case they change)
    updateUserDisplayName();
    var userImage = localStorage.getItem('profileimage') || '../assets/img/img1.jpg';
    $('.spanuserimg').attr('src', userImage);
    
    // Update user role (try sync first, then async if not found)
    var userRole = getUserRole();
    if (userRole) {
        $('.spanuserrole').html(escapeHtml(userRole));
    } else {
        // Fetch asynchronously if not in localStorage
        getUserRole(true).then(function(role) {
            if (role) {
                $('.spanuserrole').html(escapeHtml(role));
            } else {
                $('.spanuserrole').html(escapeHtml('Member'));
            }
        });
    }
    
    // Update user email
    var userEmail = getUserEmail();
    if (userEmail) {
        $('.spanuseremail').html('<i class="ri-mail-line me-1"></i>' + escapeHtml(userEmail)).show();
    } else {
        $('.spanuseremail').hide();
    }
}

/**
 * Auto-initialize user profile dropdown on page load
 * This function runs automatically when the DOM is ready
 * It initializes the user role and email in the profile dropdown across all pages
 */
function autoInitUserProfileDropdown() {
    // Check if dropdown exists on the page
    if ($('.dropdown-profile').length === 0) {
        return; // No dropdown on this page, skip initialization
    }
    
    // Check if spanuserrole element exists (indicates dropdown is present)
    if ($('.spanuserrole').length === 0) {
        return; // Dropdown structure not found, skip
    }
    
    // Initialize user profile dropdown with role and email
    if (typeof getUserRole === 'function' && typeof getUserEmail === 'function') {
        // Try to get user role synchronously first
        var userRole = getUserRole();
        
        // If not found, fetch asynchronously from API
        if (!userRole) {
            getUserRole(true).then(function(role) {
                if (role) {
                    $('.spanuserrole').html(escapeHtml(role));
                } else {
                    $('.spanuserrole').html(escapeHtml('Member'));
                }
            });
        } else {
            $('.spanuserrole').html(escapeHtml(userRole));
        }
        
        // Update user email
        var userEmail = getUserEmail();
        if (userEmail) {
            $('.spanuseremail').html('<i class="ri-mail-line me-1"></i>' + escapeHtml(userEmail)).show();
        } else {
            $('.spanuseremail').hide();
        }
    }
}

// Auto-initialize when DOM is ready
$(document).ready(function() {
    // Wait a bit to ensure all scripts are loaded
    setTimeout(function() {
        autoInitUserProfileDropdown();
    }, 100);
});