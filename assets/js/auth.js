// Function to clear all user-specific localStorage data
// This should be called when a new user logs in to prevent data contamination
function clearUserSpecificLocalStorage() {
    // List of localStorage key patterns that should be user-specific
    var userSpecificPatterns = [
        'ticketsviewfilterstring',
        'ticketsviewfilterstring_id',
        'ticketgrouping_id',
        'ticketDetailNavigationContext'
    ];
    
    // Get all keys in localStorage
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key) {
            // Check if this key matches any user-specific pattern
            userSpecificPatterns.forEach(function(pattern) {
                // Remove keys matching the pattern exactly (old format without userid)
                if (key === pattern) {
                    keysToRemove.push(key);
                }
                // Remove keys matching pattern with any userid suffix (all user data)
                // We clear ALL user-specific data on login to start fresh
                if (key.startsWith(pattern + '_')) {
                    keysToRemove.push(key);
                }
            });
        }
    }
    
    // Remove all identified keys
    keysToRemove.forEach(function(key) {
        localStorage.removeItem(key);
    });
    
    // Log cleanup for debugging (optional)
    if (keysToRemove.length > 0) {
        console.log('Cleared ' + keysToRemove.length + ' user-specific localStorage items on login');
    }
}

function initiatelogin() {
    // Check for cross-domain authentication first
    checkCrossDomainAuth();
    
    // Check for auto-login
    checkAutoLogin();
    
    $('#tloginname').focus();
    $(document).keypress(function (e) {
        if (e.which == 13) {
            if ($('#blogin').prop('disabled')) {
                //do nothing
            } else {
                loginuser();
            }
        }
    });
}

// Function to check for cross-domain authentication
async function checkCrossDomainAuth() {
    // Check if cross-domain auth is available
    if (typeof window.crossDomainAuth === 'undefined') {
        return;
    }

    try {
        // First check URL parameters for immediate auth data
        const urlAuthSuccess = window.crossDomainAuth.syncFromUrl();
        if (urlAuthSuccess) {
            checkAutoLogin();
            return;
        }

        // Check cross-domain storage
        const authData = await window.crossDomainAuth.getAuthData();
        if (authData && window.crossDomainAuth.isValidAuthData(authData)) {
            // Clear all user-specific localStorage data from previous users
            clearUserSpecificLocalStorage();
            
            // Store in local storage for compatibility
            Object.keys(authData).forEach(key => {
                if (authData[key] !== null && authData[key] !== undefined) {
                    localStorage.setItem(key, authData[key]);
                }
            });
            
            // Proceed with auto-login
            checkAutoLogin();
        } else {
        }
    } catch (error) {
        console.warn('Cross-domain auth check failed:', error);
    }
}

// Function to check if user can be auto-logged in
function checkAutoLogin() {
    const userToken = localStorage.getItem('userToken');
    const userId = localStorage.getItem('userId');
    const displayName = localStorage.getItem('displayName');
    // Check if we have the required data for auto-login
    if (userToken && userId && displayName) {
        
        // Show loading state
        showAutoLoginLoading();
        
        // Validate the token by making a test API call
        validateTokenAndAutoLogin(userToken);
    } else {
    }
}

// Function to validate token and proceed with auto-login
function validateTokenAndAutoLogin(userToken) {
    // Get displayName from localStorage for use in the callback
    const displayName = localStorage.getItem('displayName');
    
    // For now, we'll skip token validation and proceed with auto-login
    // The token will be validated when the user makes their first API call
    
    // Update the UI to show successful auto-login
    $('.loginareadiv').animate({ opacity: 0 }, 500).slideUp(300);
    $('.loginlogo').animate({ opacity: 0 }, 500).slideUp(300);
    $('.logintitle').html(displayName + ',');
    $('.loginsubtitle').html('Welcome back! Getting things ready for you!&nbsp;&nbsp;<i class="fa fa-circle-notch fa-spin"></i>');
    $('.card-footer').html('');
    $('.loginlogo').html('');
    
    // Refresh timezone in core.js
    if (typeof refreshUserTimezone === 'function') {
        refreshUserTimezone();
    }
    
    // Redirect to portal after a short delay
    setTimeout(function () {
        window.location.replace('../app/portalhome.html');
    }, 1500);
}

// Function to show auto-login loading state
function showAutoLoginLoading() {
    $('.loginareadiv').html(`
        <div class="text-center">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted">Checking your session...</p>
        </div>
    `);
    $('#blogin').prop('disabled', true);
}

// Function to hide auto-login loading state
function hideAutoLoginLoading() {
    // Restore the original login form
    $('.loginareadiv').html(`
        <div class="production">
            <div class="row gx-2">
                <div class="mb-4">
                    <label class="form-label">Email address</label>
                    <input type="text" class="form-control" id="tloginname" placeholder="Enter your email address" autocomplete="off">
                </div>
                <div class="mb-4">
                    <label class="form-label d-flex justify-content-between">Password <a href="requestpasswordreset.html" class="production">Forgot password?</a></label>
                    <input type="password" class="form-control" id="tpassword" placeholder="Enter your password" autocomplete="off">
                </div>
                <button class="btn btn-primary btn-sign" id="blogin" onclick="loginuser();">Sign In</button>
            </div>
        </div>
    `);
    $('#blogin').prop('disabled', false);
    $('#tloginname').focus();
}

function loginuser() {
    let loginname = $('#tloginname').val().trim();
    let password = $('#tpassword').val().trim();
    if (loginname === '' || password === '') {
        notifyuser('Please fill in all fields', 'error');
        return;
    }
    $.ajax({
        url: getapiendpoint() + '/api/Auth/login',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
            loginname, password
        }),
        success: function (data) {
            $('.loginareadiv').animate({ opacity: 0 }, 500).slideUp(300);
            $('.loginlogo').animate({ opacity: 0 }, 500).slideUp(300);
            $('.logintitle').html(data.displayName + ',');
            $('.loginsubtitle').html('Sign In Succesful, Getting things ready for you!&nbsp;&nbsp;<i class="fa fa-circle-notch fa-spin"></i>');
            $('.card-footer').html('');
            $('.loginlogo').html('');
            
            // Clear all user-specific localStorage data from previous users
            clearUserSpecificLocalStorage();
            
            // Prepare authentication data
            const authData = {
                userToken: data.userToken,
                userId: data.userId,
                displayName: data.displayName,
                emailAddress: data.emailAddress,
                userImage: data.profileImage,
                userTimezone: data.timeZone || '',
                appversion: data.appVersion || '',
                profileimage: data.profileImage
            };
            
            // Set organization ID
            let organizationIds = data.organizationIds;
            if (organizationIds.length > 0) {
                let organizationId = organizationIds[0];
                authData.orgId = organizationId;
                localStorage.setItem('orgId', organizationId);
            }
            
            // Store in localStorage for compatibility
            Object.keys(authData).forEach(key => {
                localStorage.setItem(key, authData[key]);
            });
            
            // Refresh the API key in core.js
            if (typeof refreshApiKey === 'function') {
                refreshApiKey();
            }
            
            // Store in cross-domain storage
            if (typeof window.crossDomainAuth !== 'undefined') {
                window.crossDomainAuth.storeAuthData(authData);
            }
            
            // Refresh timezone in core.js
            if (typeof refreshUserTimezone === 'function') {
                refreshUserTimezone();
            }
            
            setTimeout(function () {
                window.location.replace('../app/portalhome.html');
            }, 1500); 
        },
        error: function (xhr, status, error) {
            localStorage.setItem('userToken', '');
            notifyuser('Login Failed', 'error');
        }
    });
}

// Function to handle re-authentication from expired token modal
function reAuthenticateUser() {
    let loginname = $('#treauth-loginname').val().trim();
    let password = $('#treauth-password').val().trim();
    
    if (loginname === '' || password === '') {
        notifyuser('Please fill in all fields', 'error');
        return;
    }
    
    // Disable the login button to prevent multiple submissions
    $('#breauth-login').prop('disabled', true).html('<i class="fa fa-circle-notch fa-spin"></i> Authenticating...');
    
    $.ajax({
        url: getapiendpoint() + '/api/Auth/login',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        data: JSON.stringify({
            loginname, password
        }),
        success: function (data) {
            
            // Clear all user-specific localStorage data from previous users
            clearUserSpecificLocalStorage();
            
            // Prepare authentication data
            const authData = {
                userToken: data.userToken,
                userId: data.userId,
                displayName: data.displayName,
                emailAddress: data.emailAddress,
                userImage: data.profileImage,
                userTimezone: data.timeZone || '',
                appversion: data.appVersion || '',
                profileimage: data.profileImage
            };
            
            // Set organization ID
            let organizationIds = data.organizationIds;
            if (organizationIds.length > 0) {
                let organizationId = organizationIds[0];
                authData.orgId = organizationId;
                localStorage.setItem('orgId', organizationId);
            }
            
            // Update localStorage with new token
            Object.keys(authData).forEach(key => {
                localStorage.setItem(key, authData[key]);
            });
            
            // Store in cross-domain storage
            if (typeof window.crossDomainAuth !== 'undefined') {
                window.crossDomainAuth.storeAuthData(authData);
            }
            
            // Refresh timezone in core.js
            if (typeof refreshUserTimezone === 'function') {
                refreshUserTimezone();
            }
            
            // Refresh the API key in core.js
            if (typeof refreshApiKey === 'function') {
                refreshApiKey();
            }
            
            
            // Close the modal using the stored Bootstrap instance
            $('#reauthModal').modal('hide');
            
            // Show success message
            notifyuser('Re-authentication successful', 'success');
            
            // Retry any pending request
            retryPendingRequest();
            
        },
        error: function (xhr, status, error) {
            notifyuser('Re-authentication failed', 'error');
            
            // Re-enable the login button
            $('#breauth-login').prop('disabled', false).html('Sign In');
        }
    });
}

// Function to retry the pending request after successful re-authentication
function retryPendingRequest() {
    if (window.pendingRequest) {
        const request = window.pendingRequest;
        window.pendingRequest = null; // Clear the pending request
        
        // Update the API key for the retry
        request.headers = request.headers || {};
        request.headers["X-API-KEY"] = localStorage.getItem('userToken');
        
        // Refresh the global API key in core.js
        if (typeof refreshApiKey === 'function') {
            refreshApiKey();
        }
        
        // Retry the request
        $.ajax(request);
    }
}

// Function to show the re-authentication modal
function showReAuthModal() {
    
    // Check if modal exists
    if ($('#reauthModal').length === 0) {
        createReAuthModal();
    }
    
    // Clear any previous values
    $('#treauth-loginname').val('');
    $('#treauth-password').val('');

    $('#reauthModal').modal('show');
    $('#treauth-loginname').focus();
}

// Function to handle expired token errors
function handleExpiredToken(xhr, status, error) {
    
    // Clear the expired token
    localStorage.setItem('userToken', '');
    
    // Show the re-authentication modal
    showReAuthModal();
}

// Function to check if an error response indicates an expired token
function isTokenExpiredError(xhr) {
    // Check for 401 Unauthorized status
    if (xhr.status === 401) {
        return true;
    }
    
    // Check for specific error messages that might indicate expired tokens
    if (xhr.responseText) {
        const responseText = xhr.responseText.toLowerCase();
        if (responseText.includes('token expired') || 
            responseText.includes('unauthorized') || 
            responseText.includes('invalid token') ||
            responseText.includes('authentication failed')) {
            return true;
        }
    }
    
    return false;
}

// Function to setup global AJAX error handling for authentication
function setupAuthErrorHandling() {
    // Check if we've already set up the error handling
    if (window.authErrorHandlingSetup) {
        return;
    }
    
    // Mark that we've set up the error handling
    window.authErrorHandlingSetup = true;
    
    // Override the global AJAX error handler
    $(document).ajaxError(function(event, xhr, settings, error) {
        // Check if this is an authentication error
        if (isTokenExpiredError(xhr)) {
            // Store the failed request for retry after re-authentication
            window.pendingRequest = {
                url: settings.url,
                type: settings.type,
                data: settings.data,
                dataType: settings.dataType,
                contentType: settings.contentType,
                headers: settings.headers,
                success: settings.success,
                error: settings.error
            };
            
            // Handle the expired token
            handleExpiredToken(xhr, settings.status, error);
            
            // Prevent the original error handler from running
            event.preventDefault();
            return false;
        }
        
        // For non-auth errors, let them proceed normally
        // (jQuery will handle them with any other registered handlers)
    });
}

// Function to create and inject the re-authentication modal
function createReAuthModal() {
    //console.log('createReAuthModal called - Checking if modal exists...');
    
    // Check if modal already exists
    if ($('#reauthModal').length > 0) {
        //console.log('Modal already exists, skipping creation');
        return;
    }
    
    //console.log('Creating new re-authentication modal...');
    
    const modalHtml = `
        <div class="modal fade" id="reauthModal" tabindex="-1" aria-labelledby="reauthModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="reauthModalLabel">
                            <i class="fa fa-exclamation-triangle text-warning me-2"></i>
                            Session Expired
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-3">Your session has expired. Please sign in again to continue.</p>
                        <form id="reauthForm">
                            <div class="mb-3">
                                <label for="treauth-loginname" class="form-label">Login Name</label>
                                <input type="text" class="form-control" id="treauth-loginname" placeholder="Enter your login name" required>
                            </div>
                            <div class="mb-3">
                                <label for="treauth-password" class="form-label">Password</label>
                                <input type="password" class="form-control" id="treauth-password" placeholder="Enter your password" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="breauth-login" onclick="reAuthenticateUser()">Sign In</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Append the modal to the body
    $('body').append(modalHtml);
    
    // Setup form submission on Enter key
    $('#reauthForm').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            reAuthenticateUser();
        }
    });
    
    // Prevent modal from being closed by clicking outside or pressing escape
    $('#reauthModal').on('hide.bs.modal', function (e) {
        // Only allow closing if user has successfully re-authenticated
        if (!localStorage.getItem('userToken') || localStorage.getItem('userToken') === '') {
            e.preventDefault();
            return false;
        }
    });
    
    //console.log('Re-authentication modal created and injected into DOM');
}

// Function to initialize authentication error handling
function initAuthErrorHandling() {
    //console.log('initAuthErrorHandling called - Starting initialization...');
    //console.log('appversion: ' + appversion, 'localStorage.getItem(appversion): ' + localStorage.getItem('appversion'));
    //if (localStorage.getItem('appversion') !== appversion) {
        //butterup.toast({
            //message: 'Please update the app to the latest version to continue. <a href="#!" onclick="logoutuser();">Download Latest Version</a>',
            //type: 'warning',
            //location: 'top-center'
       // });
    //}
    // Create the re-authentication modal
    createReAuthModal();
    //console.log('Modal creation complete');
    
    // Setup global AJAX error handling
    setupAuthErrorHandling();
    //console.log('AJAX error handling setup complete');
    
    //console.log('Authentication error handling initialization complete!');
}

function logoutuser() {
    $.ajax({
        url: getapiendpoint() + '/api/Auth/logout',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        headers: {
            "X-API-KEY": apikey
        },
        success: function (data) {
            // Clear localStorage
            localStorage.setItem('userToken', '');
            localStorage.setItem('userId', '');
            localStorage.setItem('displayName', '');
            localStorage.setItem('emailAddress', '');
            localStorage.setItem('orgId', '');
            
            // Clear cross-domain storage
            if (typeof window.crossDomainAuth !== 'undefined') {
                window.crossDomainAuth.clearAuthData();
            }
            
            // Force cache bypass and redirect to login
            window.location.replace('../auth/login.html?t=' + Date.now() + '&logout=true');
        },
        error: function (xhr, status, error) {
            localStorage.setItem('userToken', '');
            
            // Clear cross-domain storage even on error
            if (typeof window.crossDomainAuth !== 'undefined') {
                window.crossDomainAuth.clearAuthData();
            }
            
            notifyuser('Logout Failed', 'error');
            // Force cache bypass and redirect to login
            window.location.replace('../auth/login.html?t=' + Date.now() + '&logout=true');
        }
    });
}

function registeruser() {
    // Disable the button and show spinner
    $('#blogin').html('<i class="fa fa-spin fa-spinner"></i>&nbsp;Signing Up');
    $('#blogin').prop('disabled', true);

    // Sanitize input data to prevent XSS attacks
    var fullname = $('#tfullname').val();
    var emailaddress = $('#temailaddress').val();
    var birthdate = $('#tbirthdate').val();
    // Get the user's local timezone
    var timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Get the user's language (locale)
    var language = navigator.language || navigator.userLanguage;
    
    $.ajax({
        type: "POST",
        url: getapiendpoint() + "/api/auth/register",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ 
            fullName: fullname, 
            emailAddress: emailaddress, 
            birthDate: birthdate, 
            timeZone: timeZone, 
            language: language 
        }),
        dataType: "json",
        success: function (response) {
            // Handle successful response
            if (response.success) {
                notifyuser("User Registered Successfully!", "success");
                $('.card-sign').html('<h3>Success!</h3><div class="alert alert-success">You are registered! Please check your email for important information about verification and next steps.</div>');
                redirectuser("login.html")
            } else {
                notifyuser(response.message, "error");
            }
            $('#blogin').html('Sign Up');
            $('#blogin').prop('disabled', false);
        },
        error: function (e) {
            // Log error details and re-enable button
            var errorMessage = "User Registration Failed";
            if (e.responseJSON && e.responseJSON.message) {
                errorMessage = e.responseJSON.message;
            }
            notifyuser(errorMessage, "error");
            $('#blogin').html('Sign Up');
            $('#blogin').prop('disabled', false);
        }
    });
}

function initiateverifyemail() {
    $('#temailaddress').val('Fetching E-Mail...')
    $('#blogin').prop('disabled', true);
    var verificationtoken = getUrlVars()["token"].replace("#!","");
    $.ajax({
        type: "GET",
        url: getapiendpoint() + "/api/auth/token-info?token=" + encodeURIComponent(verificationtoken),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (response) {
            $('#temailaddress').val(scrambleEmail(response.tokenInfo.split('|')[0]));
            $('#tverificationcode').val(response.tokenInfo.split('|')[1]).prop('disabled',true);
            $('#hemail').text(response.tokenInfo.split('|')[0]);
            verifyemail();
        },
        error: function (e) {
            // Log error details and re-enable button
            notifyuser("Token Verification Failed", "error");
        }
    });
    $('#tverificationcode').keyup(function (e) {
        if ($('#tverificationcode').val().length > 5) {
            $('#blogin').prop('disabled', false);
        } else {
            $('#blogin').prop('disabled', true);
        }
    });
}

function verifyemail() {
    // Disable the login button and show spinner
    $('#blogin').html('<i class="fa fa-spin fa-spinner"></i>&nbsp;Verifying Email');
    $('#blogin').prop('disabled', true);

    // Extract URL parameters safely
    var verificationtoken = decodeURIComponent(getUrlVars()["token"].replace("#!", ""));
    var verificationcode = $('#tverificationcode').val();
    var emailaddress = $('#hemail').text();

    // Basic form validation
    if (!verificationtoken || !verificationcode || !emailaddress) {
        notifyuser("Please fill in all fields", "error");
        $('#blogin').html('Verify Email');
        $('#blogin').prop('disabled', false);
        return;
    }

    $.ajax({
        type: "POST",
        url: getapiendpoint() + "/api/auth/verify",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ 
            verificationToken: verificationtoken, 
            verificationCode: verificationcode, 
            emailAddress: emailaddress 
        }),
        dataType: "json",
        success: function (response) {
            if (response.success) {
                notifyuser("Verified Successfully", "success");
                setTimeout(function () {
                    window.location.replace("forgotpassword.html?token=" + response.passwordResetToken);
                }, 3000); // 3000 milliseconds = 3 seconds
            } else {
                notifyuser(response.message || "E-Mail Verification Failed. Invalid Code", "error");
            }
            $('#blogin').html('Verify Email');
            $('#blogin').prop('disabled', false);
        },
        error: function (e) {
            console.error("Error during token verification:", e.responseJSON);
            var errorMessage = "Token Verification Failed";
            if (e.responseJSON && e.responseJSON.message) {
                errorMessage = e.responseJSON.message;
            }
            notifyuser(errorMessage, "error");
            $('#blogin').html('Verify Email');
            $('#blogin').prop('disabled', false);
        }
    });
}

function initiateforgotpassword() {
    $('#temailaddress').val('Fetching E-Mail...')
    var verificationtoken = getUrlVars()["token"].replace("#!", "");
    $.ajax({
        type: "GET",
        url: getapiendpoint() + "/api/auth/reset-token-info?token=" + encodeURIComponent(verificationtoken),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (response) {
            $('#temailaddress').val(scrambleEmail(response.emailAddress));
            $('#hemail').text(response.emailAddress);
        },
        error: function (e) {
            // Log error details and re-enable button
            notifyuser("Token Verification Failed", "error");
        }
    });
}

function requestresetpassword() {
    $('#blogin').html('<i class="fa fa-spin fa-spinner"></i>&nbsp;Requesting Reset');
    var emailaddress = $('#temailaddress').val();
    $.ajax({
        type: "POST",
        url: getapiendpoint() + "/api/auth/request-password-reset",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ emailAddress: emailaddress }),
        dataType: "json",
        success: function (response) {
            var ttxt = "";
            ttxt = '<h3 class="card-title">Success&nbsp;</h3><div class="alert alert-success">If the entered email exists in the system, a password reset link will arrive in the mailbox.&nbsp;<a href="login.html">Back to Login</a></div>'
            $('.card-sign').html(ttxt);
        },
        error: function (e) {
            // Log error details and re-enable button
            notifyuser("Reset Request Failed", "error");
        }
    });
}

function changeuserpassword() {
    $('#blogin').html('<i class="fa fa-spin fa-spinner"></i>&nbsp;Requesting Password Reset');

    var verificationtoken = getUrlVars()["token"].replace("#!", "");
    var emailaddress = $('#hemail').text();
    var password1 = $('#tpassword1').val();
    var password2 = $('#tpassword2').val();

    // Validate input
    if (!verificationtoken || !emailaddress || !password1 || !password2) {
        notifyuser("All fields are required", "error");
        $('#blogin').html('Reset Password');
        return;
    }

    if (password1 !== password2) {
        notifyuser("Passwords do not match", "error");
        $('#blogin').html('Reset Password');
        return;
    }

    $.ajax({
        type: "POST",
        url: getapiendpoint() + "/api/auth/change-password",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ 
            verificationToken: verificationtoken, 
            emailAddress: emailaddress, 
            newPassword: password1, 
            confirmPassword: password2 
        }),
        dataType: "json",
        success: function (response) {
            if (response.success) {
                notifyuser("Password Reset Successfully", "success");
                $('#blogin').html('<i class="fa fa-spin fa-spinner"></i>&nbsp;Redirecting');
                setTimeout(function () {
                    window.location.replace("login.html");
                }, 3000); // 3000 milliseconds = 3 seconds
            } else {
                notifyuser(response.message || "Password Reset Failed", "error");
                $('#blogin').html('Reset Password');
            }
        },
        error: function (e) {
            // Log error details and re-enable button
            console.error(e.responseJSON);
            var errorMessage = "Reset Request Failed";
            if (e.responseJSON && e.responseJSON.message) {
                errorMessage = e.responseJSON.message;
            }
            notifyuser(errorMessage, "error");
            $('#blogin').html('Reset Password');
        }
    });
}