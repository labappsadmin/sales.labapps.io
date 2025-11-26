// Sales Module Core Functions
// Provides common utilities for all sales module pages

// Format currency
function formatCurrency(amount) {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    var date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Format datetime
function formatDateTime(dateString) {
    if (!dateString) return '';
    var date = new Date(dateString);
    return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Get API headers
function getSalesApiHeaders() {
    return {
        'X-API-KEY': apikey,
        'Content-Type': 'application/json'
    };
}

// Make API call with error handling
function salesApiCall(url, method, data, successCallback, errorCallback) {
    $.ajax({
        url: getapiendpoint() + url,
        method: method || 'GET',
        headers: getSalesApiHeaders(),
        data: data ? JSON.stringify(data) : null,
        contentType: 'application/json',
        success: function(response) {
            if (successCallback) successCallback(response);
        },
        error: function(xhr) {
            console.error('Sales API Error:', xhr);
            if (xhr.status === 401) {
                // Authentication error handling is managed globally by auth.js
                // Don't show additional error messages for 401
            } else if (errorCallback) {
                errorCallback(xhr);
            } else {
                var errorMessage = 'An error occurred';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.responseText) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.message) {
                            errorMessage = response.message;
                        }
                    } catch (e) {
                        // Use default error message
                    }
                }
                if (xhr.status !== 401) { // Don't show message for 401 - handled by auth system
                    notifyuser(errorMessage, 'error');
                }
            }
        }
    });
}

// Load users for dropdowns (Sales users only - userrole LIKE 'Sales%')
function loadSalesUsers(selectElement, orgid) {
    if (!selectElement || !orgid) return;
    salesApiCall('/api/Users/byorg/' + orgid + '?roleFilter=Sales', 'GET', null, function(users) {
        var html = '<option value="">Select User</option>';
        if (users && users.length > 0) {
            users.forEach(function(user) {
                var name = user.displayname || 
                           (user.firstname && user.lastname ? user.firstname + ' ' + user.lastname : null) ||
                           user.emailaddress || 
                           user.loginname ||
                           'User ' + user.userid;
                html += '<option value="' + user.userid + '">' + name + '</option>';
            });
        }
        $(selectElement).html(html);
    });
}

// Load accounts for dropdowns
function loadSalesAccounts(selectElement, orgid) {
    if (!selectElement || !orgid) return;
    salesApiCall('/api/salesaccounts?orgid=' + orgid, 'GET', null, function(accounts) {
        var html = '<option value="">Select Account</option>';
        if (accounts && accounts.length > 0) {
            accounts.forEach(function(account) {
                html += '<option value="' + account.accountid + '">' + account.accountname + '</option>';
            });
        }
        $(selectElement).html(html);
    });
}

// Load territories for dropdowns
function loadSalesTerritories(selectElement, orgid) {
    if (!selectElement || !orgid) return;
    salesApiCall('/api/salesadmin/territories?orgid=' + orgid, 'GET', null, function(territories) {
        var html = '<option value="">Select Territory</option>';
        if (territories && territories.length > 0) {
            territories.forEach(function(territory) {
                html += '<option value="' + territory.territoryid + '">' + territory.territoryname + '</option>';
            });
        }
        $(selectElement).html(html);
    });
}

// Calculate lead score (client-side helper)
function calculateLeadScore(lead) {
    var score = 0;
    // Basic scoring logic (can be enhanced)
    if (lead.email && lead.email.includes('@')) score += 10;
    if (lead.phone) score += 10;
    if (lead.source === 'Website') score += 20;
    if (lead.source === 'Referral') score += 30;
    return score;
}

// Show success message (using Butterup notifications)
function showSalesSuccess(message) {
    notifyuser(message, 'success');
}

// Show error message (using Butterup notifications)
function showSalesError(message) {
    notifyuser(message, 'error');
}

// Confirm action
function confirmSalesAction(message, callback) {
    Swal.fire({
        title: 'Confirm',
        text: message,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
    }).then(function(result) {
        if (result.isConfirmed && callback) {
            callback();
        }
    });
}

