// Sales Leads Management JavaScript

var currentPage = 1;
var pageSize = 50;
var selectedLeadIds = [];
var currentFilters = {};
var placesCache = {};
var placesCacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
var isLoading = false;
var hasMoreData = true;
var currentStatusFilter = 'New';

function initializeLeadPage() {
    loadSalesUsers('#leadAssignedTo', orgid);
    loadSalesTerritories('#leadTerritory', orgid);
    loadSalesUsers('#filterAssignedTo', orgid);
    $('#leadTerritory, #leadAssignedTo').select2({
        dropdownParent: $('#modalAddLead')
    });
    $('#filterAssignedTo').select2();
    $('#filterStatus').select2({
        data: [
            { id: 'New', text: 'New' },
            { id: 'Contacted', text: 'Contacted' },
            { id: 'Qualified', text: 'Qualified' },
            { id: 'Converted', text: 'Converted' },
            { id: 'Lost', text: 'Lost' }
        ],
        dropdownParent: $('#modalFilters')
    });
    $('#filterSource').select2({
        data: [
            { id: 'Website', text: 'Website' },
            { id: 'Referral', text: 'Referral' },
            { id: 'Email', text: 'Email' },
            { id: 'Phone', text: 'Phone' },
            { id: 'Social Media', text: 'Social Media' },
            { id: 'Trade Show', text: 'Trade Show' },
            { id: 'Other', text: 'Other' }
        ],
        dropdownParent: $('#modalFilters')
    });
    
    $('#chkSelectAll').on('change', function() {
        $('.chkLead').prop('checked', $(this).is(':checked'));
        updateSelectedLeads();
        updateRowHighlighting();
    });
    
    // Setup Google Places autocomplete for lead name
    setupLeadNameAutocomplete();
    
    // Setup bulk operations
    setupBulkOperations();
    
    // Setup lazy loading
    setupLazyLoading();
}

var bulkUpdateValues = {};

function setupBulkOperations() {
    // Load users for bulk assign dropdown
    loadBulkAssignedDropdown();
    
    // Setup dropdown item click handlers
    $('#bulkStatusDropdown .dropdown-item').on('click', function(e) {
        e.preventDefault();
        bulkUpdateValues.status = $(this).data('value');
        $(this).closest('.dropdown').find('.dropdown-toggle').text('Status: ' + bulkUpdateValues.status);
    });
    
    $('#bulkSourceDropdown .dropdown-item').on('click', function(e) {
        e.preventDefault();
        bulkUpdateValues.source = $(this).data('value');
        $(this).closest('.dropdown').find('.dropdown-toggle').text('Source: ' + bulkUpdateValues.source);
    });
}

function loadBulkAssignedDropdown() {
    salesApiCall('/api/Users/byorg/' + orgid + '?roleFilter=Sales', 'GET', null, function(users) {
        var html = '';
        if (users && users.length > 0) {
            users.forEach(function(user) {
                var name = user.displayname || 
                           (user.firstname && user.lastname ? user.firstname + ' ' + user.lastname : null) ||
                           user.emailaddress || 
                           user.loginname ||
                           'User ' + user.userid;
                html += '<li><a class="dropdown-item" href="#" data-value="' + user.userid + '">' + name + '</a></li>';
            });
        }
        $('#bulkAssignedDropdown').html(html);
        
        // Setup click handler for dynamically loaded items
        $('#bulkAssignedDropdown .dropdown-item').on('click', function(e) {
            e.preventDefault();
            bulkUpdateValues.assignedto = $(this).data('value');
            $(this).closest('.dropdown').find('.dropdown-toggle').text('Assigned: ' + $(this).text());
        });
    });
}

function applyBulkUpdate() {
    if (selectedLeadIds.length === 0) {
        showSalesError('Please select at least one lead');
        return;
    }
    
    if (Object.keys(bulkUpdateValues).length === 0) {
        showSalesError('Please select at least one field to update');
        return;
    }
    
    confirmSalesAction('Update ' + selectedLeadIds.length + ' selected lead(s)?', function() {
        var updatePromises = selectedLeadIds.map(function(leadId) {
            return new Promise(function(resolve, reject) {
                // Find the lead in allLeadsData to get existing values
                var existingLead = allLeadsData.find(function(l) { return l.leadid === leadId; });
                if (!existingLead) {
                    reject();
                    return;
                }
                
                // Merge existing data with updates
                var updateData = {
                    orgid: orgid,
                    leadname: existingLead.leadname,
                    email: existingLead.email,
                    phone: existingLead.phone,
                    status: bulkUpdateValues.status || existingLead.status,
                    source: bulkUpdateValues.source || existingLead.source,
                    assignedto: bulkUpdateValues.assignedto ? parseInt(bulkUpdateValues.assignedto) : existingLead.assignedto
                };
                
                salesApiCall('/api/salesleads/' + leadId, 'PUT', updateData, function() {
                    resolve();
                }, function() {
                    reject();
                });
            });
        });
        
        Promise.all(updatePromises).then(function() {
            showSalesSuccess('Successfully updated ' + selectedLeadIds.length + ' lead(s)');
            resetBulkOperations();
            resetAndReload();
        }).catch(function() {
            showSalesError('Some leads could not be updated');
            resetAndReload();
        });
    });
}

function bulkDeleteLeads() {
    if (selectedLeadIds.length === 0) {
        showSalesError('Please select at least one lead');
        return;
    }
    
    confirmSalesAction('Delete ' + selectedLeadIds.length + ' selected lead(s)? This cannot be undone.', function() {
        var deletePromises = selectedLeadIds.map(function(leadId) {
            return new Promise(function(resolve, reject) {
                salesApiCall('/api/salesleads/' + leadId + '?orgid=' + orgid, 'DELETE', null, function() {
                    resolve();
                }, function() {
                    reject();
                });
            });
        });
        
        Promise.all(deletePromises).then(function() {
            showSalesSuccess('Successfully deleted ' + selectedLeadIds.length + ' lead(s)');
            resetBulkOperations();
            resetAndReload();
        }).catch(function() {
            showSalesError('Some leads could not be deleted');
            resetAndReload();
        });
    });
}

function resetBulkOperations() {
    selectedLeadIds = [];
    bulkUpdateValues = {};
    $('#chkSelectAll').prop('checked', false);
    $('.chkLead').prop('checked', false);
    $('#bulkOperationsRow').hide();
    
    // Reset dropdown button text
    $('#bulkStatusDropdown').closest('.dropdown').find('.dropdown-toggle').text('Status');
    $('#bulkSourceDropdown').closest('.dropdown').find('.dropdown-toggle').text('Source');
    $('#bulkAssignedDropdown').closest('.dropdown').find('.dropdown-toggle').text('Assigned To');
    
    updateRowHighlighting();
}

var allLeadsData = []; // Store all leads for client-side filtering

function loadLeadsByTab(status) {
    // Update active tab
    $('#leadStatusTabs .nav-link').removeClass('active');
    $('#leadStatusTabs .nav-link[data-status="' + status + '"]').addClass('active');
    
    currentStatusFilter = status;
    
    // Filter locally instead of reloading
    filterLeadsByStatus(status);
}

function filterLeadsByStatus(status) {
    var filteredLeads = allLeadsData;
    if (status) {
        filteredLeads = allLeadsData.filter(function(lead) {
            return lead.status === status;
        });
    }
    renderLeadsTable(filteredLeads);
    updateTabCounts();
}

function updateTabCounts() {
    var counts = {
        'New': 0,
        'Contacted': 0,
        'Qualified': 0,
        'Converted': 0
    };
    
    allLeadsData.forEach(function(lead) {
        if (counts.hasOwnProperty(lead.status)) {
            counts[lead.status]++;
        }
    });
    
    $('#leadStatusTabs .nav-link').each(function() {
        var status = $(this).data('status');
        var count = counts[status] || 0;
        $(this).html(status + ' (' + count + ')');
    });
}

function loadLeads(status, append) {
    if (!orgid || isLoading) return;
    
    isLoading = true;
    currentStatusFilter = status || '';
    
    var url = '/api/salesleads/paginated?orgid=' + orgid + '&page=' + currentPage + '&pageSize=' + pageSize;
    
    // Apply filters
    if (currentFilters.source) url += '&source=' + currentFilters.source;
    if (currentFilters.assignedto) url += '&assignedto=' + currentFilters.assignedto;
    if (currentFilters.minscore) url += '&minscore=' + currentFilters.minscore;
    
    if (!append) {
        $('#leadsTableBody').html('<tr><td colspan="11" class="text-center">Loading leads...</td></tr>');
    }
    
    salesApiCall(url, 'GET', null, function(response) {
        isLoading = false;
        if (response && response.data) {
            if (append) {
                allLeadsData = allLeadsData.concat(response.data);
            } else {
                allLeadsData = response.data;
            }
            
            // Update pagination state
            if (response.pagination) {
                hasMoreData = response.pagination.hasNextPage;
                updateLeadsStatus(response.pagination.totalCount);
            }
            
            filterLeadsByStatus(currentStatusFilter);
        }
    }, function() {
        isLoading = false;
    });
}

function loadMoreLeads() {
    if (!isLoading && hasMoreData) {
        currentPage++;
        loadLeads(currentStatusFilter, true);
    }
}

function updateLeadsStatus(totalCount) {
    var statusText = 'Showing ' + allLeadsData.length + ' of ' + totalCount + ' leads';
    $('#paginationContainer').html('<div class="text-center text-muted">' + statusText + '</div>');
}

function setupLazyLoading() {
    $(window).off('scroll.lazyload').on('scroll.lazyload', function() {
        if (isLoading || !hasMoreData) return;
        
        var scrollTop = $(window).scrollTop();
        var windowHeight = $(window).height();
        var documentHeight = $(document).height();
        
        // Load more when 200px from bottom
        if (scrollTop + windowHeight >= documentHeight - 200) {
            loadMoreLeads();
        }
    });
}

function renderLeadsTable(leads) {
    var html = '';
    if (leads && leads.length > 0) {
        leads.forEach(function(lead) {
            // Determine score badge class
            var scoreBadgeClass = 'score-badge-low';
            if (lead.score >= 70) scoreBadgeClass = 'score-badge-high';
            else if (lead.score >= 40) scoreBadgeClass = 'score-badge-medium';
            
            html += '<tr data-leadid="' + lead.leadid + '">' +
                   '<td><input type="checkbox" class="chkLead" value="' + lead.leadid + '" /></td>' +
                   '<td><a href="salesleaddetail.html?id=' + lead.leadid + '">' + (lead.leadnumber || 'N/A') + '</a></td>' +
                   '<td>' + (lead.leadname || 'N/A') + '</td>' +
                   '<td>' + (lead.email || 'N/A') + '</td>' +
                   '<td>' + (lead.phone || 'N/A') + '</td>' +
                   '<td>' + (lead.source || 'N/A') + '</td>' +
                   '<td><span>' + (lead.status || 'New') + '</span></td>' +
                   '<td><span>' + (lead.score || 0) + '</span></td>' +
                   '<td>' + (lead.assignedtoname || 'Unassigned') + '</td>' +
                   '<td>' + formatDate(lead.createddate) + 
                   '<span class="action-icons float-end">' +
                   '<a href="#" class="edit-icon" onclick="editLead(' + lead.leadid + '); return false;" title="Edit"><i class="ri-edit-line"></i></a>' +
                   '<a href="#" class="convert-icon" onclick="convertLead(' + lead.leadid + '); return false;" title="Convert"><i class="ri-exchange-line"></i></a>' +
                   '<a href="#" class="delete-icon" onclick="deleteLead(' + lead.leadid + '); return false;" title="Delete"><i class="ri-delete-bin-line"></i></a>' +
                   '</span></td></tr>';
        });
    } else {
        html = '<tr><td colspan="10" class="text-center text-muted">No leads found</td></tr>';
    }
    $('#leadsTableBody').html(html);
    
    $('.chkLead').on('change', function() {
        updateSelectedLeads();
        updateRowHighlighting();
    });
}


function showAddLeadModal() {
    $('#leadId').val('');
    $('#formAddLead')[0].reset();
    $('#leadStatus').prop('disabled', false);
    $('#leadAssignedTo').val(null).trigger('change');
    $('#leadTerritory').val(null).trigger('change');
    
    // Re-initialize autocomplete when modal is shown (in case it was destroyed)
    setupLeadNameAutocomplete();
    
    $('#modalAddLead .modal-title').text('Add New Lead');
    $('#modalAddLead').modal('show');
}

function editLead(leadId) {
    salesApiCall('/api/salesleads/' + leadId + '?orgid=' + orgid, 'GET', null, function(lead) {
        $('#leadId').val(lead.leadid);
        $('#leadName').val(lead.leadname);
        $('#leadEmail').val(lead.email);
        $('#leadPhone').val(lead.phone);
        $('#leadSource').val(lead.source);
        $('#leadStatus').val(lead.status).prop('disabled', true);
        $('#leadSegment').val(lead.segment);
        $('#leadAssignedTo').val(lead.assignedto).trigger('change');
        $('#leadTerritory').val(lead.territoryid).trigger('change');
        
        // Re-initialize autocomplete when modal is shown (in case it was destroyed)
        setupLeadNameAutocomplete();
        
        $('#modalAddLead .modal-title').text('Edit Lead');
        $('#modalAddLead').modal('show');
    });
}

function saveLead() {
    var leadId = $('#leadId').val();
    var leadData = {
        orgid: orgid,
        leadname: $('#leadName').val(),
        email: $('#leadEmail').val(),
        phone: $('#leadPhone').val(),
        source: $('#leadSource').val(),
        status: $('#leadStatus').val(),
        segment: $('#leadSegment').val(),
        assignedto: $('#leadAssignedTo').val() ? parseInt($('#leadAssignedTo').val()) : null,
        territoryid: $('#leadTerritory').val() ? parseInt($('#leadTerritory').val()) : null
    };
    
    var url = '/api/salesleads';
    var method = leadId ? 'PUT' : 'POST';
    if (leadId) url += '/' + leadId;
    
    salesApiCall(url, method, leadData, function(response) {
        showSalesSuccess(leadId ? 'Lead updated successfully' : 'Lead created successfully');
        $('#modalAddLead').modal('hide');
        resetAndReload();
    });
}

function deleteLead(leadId) {
    confirmSalesAction('Are you sure you want to delete this lead?', function() {
        salesApiCall('/api/salesleads/' + leadId + '?orgid=' + orgid, 'DELETE', null, function() {
            showSalesSuccess('Lead deleted successfully');
            resetAndReload();
        });
    });
}

function convertLead(leadId) {
    // First check if lead is already converted
    salesApiCall('/api/salesleads/' + leadId + '?orgid=' + orgid, 'GET', null, function(lead) {
        if (lead.status === 'Converted') {
            // Lead already converted - show add opportunity modal
            showAddOpportunityModal(leadId, lead.leadname);
            return;
        }
        showConvertLeadModal(leadId, lead.leadname);
    });
}

function showAddOpportunityModal(leadId, leadName) {
    $('#addOppLeadId').val(leadId);
    $('#addOppLeadName').text(leadName);
    $('#newOppName').val('');
    $('#newOppAmount').val('');
    $('#newOppCloseDate').val('');
    $('#modalAddOpportunity').modal('show');
}

function executeAddOpportunity() {
    var leadId = $('#addOppLeadId').val();
    var oppName = $('#newOppName').val();
    
    if (!oppName) {
        showSalesError('Opportunity name is required');
        return;
    }
    
    var data = {
        opportunityname: oppName,
        opportunityamount: $('#newOppAmount').val() ? parseFloat($('#newOppAmount').val()) : null,
        closedate: $('#newOppCloseDate').val() ? new Date($('#newOppCloseDate').val()).toISOString() : null
    };
    
    salesApiCall('/api/salesleads/' + leadId + '/add-opportunity?orgid=' + orgid, 'POST', data, function(response) {
        $('#modalAddOpportunity').modal('hide');
        showSalesSuccess('Opportunity created successfully');
        resetAndReload();
    });
}

function showConvertLeadModal(leadId, leadName) {
    $('#convertLeadId').val(leadId);
    $('#convertLeadName').text(leadName);
    $('#chkCreateAccount').prop('checked', true);
    $('#chkCreateContact').prop('checked', true);
    $('#chkCreateOpportunity').prop('checked', false);
    $('#oppFields').hide();
    $('#oppName').val('');
    $('#oppAmount').val('');
    $('#oppCloseDate').val('');
    
    // Setup opportunity fields toggle
    $('#chkCreateOpportunity').off('change').on('change', function() {
        $('#oppFields').toggle($(this).is(':checked'));
    });
    
    $('#modalConvertLead').modal('show');
}

function executeConvertLead() {
    var leadId = $('#convertLeadId').val();
    
    var data = {
        createAccount: $('#chkCreateAccount').is(':checked'),
        createContact: $('#chkCreateContact').is(':checked'),
        createOpportunity: $('#chkCreateOpportunity').is(':checked'),
        opportunityname: $('#oppName').val(),
        opportunityamount: $('#oppAmount').val() ? parseFloat($('#oppAmount').val()) : null,
        closedate: $('#oppCloseDate').val() ? new Date($('#oppCloseDate').val()).toISOString() : null
    };
    
    salesApiCall('/api/salesleads/' + leadId + '/convert?orgid=' + orgid, 'POST', data, function(response) {
        $('#modalConvertLead').modal('hide');
        showSalesSuccess('Lead converted successfully');
        resetAndReload();
    }, function(xhr) {
        var errorMessage = 'Failed to convert lead';
        if (xhr.status === 400 && xhr.responseJSON && xhr.responseJSON.error) {
            errorMessage = xhr.responseJSON.error;
        } else if (xhr.status === 404) {
            errorMessage = 'Convert endpoint not found. Please contact your administrator.';
        } else if (xhr.responseJSON && xhr.responseJSON.message) {
            errorMessage = xhr.responseJSON.message;
        }
        showSalesError(errorMessage);
    });
}

function deduplicateLeads() {
    if (selectedLeadIds.length < 2) {
        showSalesError('Please select at least 2 leads to merge');
        return;
    }
    
    confirmSalesAction('Merge ' + selectedLeadIds.length + ' selected leads?', function() {
        salesApiCall('/api/salesleads/merge', 'POST', { leadids: selectedLeadIds }, function(response) {
            showSalesSuccess('Leads merged successfully');
            selectedLeadIds = [];
            resetAndReload();
        });
    });
}

function updateSelectedLeads() {
    selectedLeadIds = [];
    $('.chkLead:checked').each(function() {
        selectedLeadIds.push(parseInt($(this).val()));
    });
    
    // Update selected count display
    $('#selectedCount').text(selectedLeadIds.length);
    
    // Show/hide bulk operations row
    if (selectedLeadIds.length > 0) {
        $('#bulkOperationsRow').show();
    } else {
        $('#bulkOperationsRow').hide();
    }
    
    // Enable/disable merge button (need at least 2 selected)
    $('#btnMergeLeads').prop('disabled', selectedLeadIds.length < 2);
}

function updateRowHighlighting() {
    // Remove all selected-row classes first
    $('#leadsTableBody tr').removeClass('selected-row');
    
    // Add selected-row class to checked rows
    $('.chkLead:checked').each(function() {
        $(this).closest('tr').addClass('selected-row');
    });
}

function applyFilters() {
    currentFilters = {
        status: $('#filterStatus').val() ? $('#filterStatus').val().join(',') : null,
        source: $('#filterSource').val() ? $('#filterSource').val().join(',') : null,
        assignedto: $('#filterAssignedTo').val() ? $('#filterAssignedTo').val() : null,
        minscore: $('#filterMinScore').val() || null
    };
    resetAndReload();
    $('#modalFilters').modal('hide');
}

function clearFilters() {
    currentFilters = {};
    $('#filterStatus, #filterSource, #filterAssignedTo').val(null).trigger('change');
    $('#filterMinScore').val('');
    resetAndReload();
}

function resetAndReload() {
    currentPage = 1;
    hasMoreData = true;
    allLeadsData = [];
    loadLeads(currentStatusFilter);
}

function showImportModal() {
    Swal.fire({
        title: 'Import Leads',
        html: '<textarea class="form-control" id="importCSV" rows="10" placeholder="Paste CSV data here (leadname,email,phone,source)"></textarea>',
        showCancelButton: true,
        confirmButtonText: 'Import',
        preConfirm: function() {
            var csv = $('#importCSV').val();
            if (!csv) {
                Swal.showValidationMessage('Please enter CSV data');
                return false;
            }
            return csv;
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            // Parse CSV and import
            var lines = result.value.split('\n');
            var leads = [];
            var headers = lines[0].split(',').map(h => h.trim());
            
            for (var i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                var values = lines[i].split(',');
                var lead = {};
                headers.forEach(function(header, index) {
                    lead[header.toLowerCase()] = values[index] ? values[index].trim() : '';
                });
                leads.push(lead);
            }
            
            salesApiCall('/api/salesleads/import?orgid=' + orgid, 'POST', { leads: leads }, function(response) {
                showSalesSuccess('Imported ' + response.imported + ' leads');
                resetAndReload();
            });
        }
    });
}

/**
 * Setup Google Places autocomplete for Lead Name field
 */
function setupLeadNameAutocomplete() {
    var selector = '#leadName';
    
    // Destroy existing autocomplete if it exists
    if ($(selector).data('autocomplete')) {
        $(selector).devbridgeAutocomplete('dispose');
    }
    
    // Check if devbridgeAutocomplete is available
    if (typeof $.fn.devbridgeAutocomplete === 'undefined') {
        console.warn('devbridgeAutocomplete library not loaded');
        return;
    }
    
    $(selector).devbridgeAutocomplete({
        lookup: function(query, done) {
            $.ajax({
                url: getapiendpoint() + '/api/Places/autocomplete',
                type: 'GET',
                data: {
                    query: query,
                    types: 'establishment',
                    fields: 'place_id,name,formatted_address,address_components'
                },
                dataType: 'json',
                headers: {
                    "X-API-KEY": apikey
                },
                success: function(response) {
                    if (response && response.suggestions) {
                        var suggestions = response.suggestions.map(function(suggestion) {
                            return {
                                value: suggestion.value,
                                data: suggestion.placeId
                            };
                        });
                        done({ suggestions: suggestions });
                    } else {
                        done({ suggestions: [] });
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error loading places autocomplete:', error);
                    done({ suggestions: [] });
                }
            });
        },
        onSelect: function(suggestion) {
            // Get detailed place information
            getPlaceDetailsForLead(suggestion.data, function(detailedPlace) {
                if (detailedPlace) {
                    fillLeadFormFromPlace(detailedPlace);
                }
            });
        },
        minChars: 2,
        deferRequestBy: 300,
        showNoSuggestionNotice: true,
        noSuggestionNotice: 'No businesses found'
    });
}

/**
 * Get place details from Places API endpoint
 */
function getPlaceDetailsForLead(placeId, callback) {
    // Check cache first
    var cacheKey = 'place_' + placeId;
    var cached = placesCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < placesCacheExpiry) {
        callback(cached.data);
        return;
    }

    $.ajax({
        url: getapiendpoint() + '/api/Places/details/' + encodeURIComponent(placeId),
        type: 'GET',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        headers: {
            "X-API-KEY": apikey
        },
        success: function(response) {
            if (response) {
                // Convert API response to the format expected by fillLeadFormFromPlace
                var place = {
                    name: response.name,
                    formatted_address: response.formattedAddress,
                    formatted_phone_number: response.formattedPhoneNumber,
                    international_phone_number: response.internationalPhoneNumber,
                    website: response.website,
                    placeId: response.placeId,
                    address_components: response.addressComponents ? response.addressComponents.map(function(ac) {
                        return {
                            long_name: ac.longName,
                            short_name: ac.shortName,
                            types: ac.types
                        };
                    }) : []
                };

                // Cache the result
                placesCache[cacheKey] = {
                    data: place,
                    timestamp: Date.now()
                };
                callback(place);
            } else {
                callback(null);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading place details:', error);
            callback(null);
        }
    });
}

/**
 * Fill lead form fields from Google Places data
 */
function fillLeadFormFromPlace(place) {
    if (!place) return;

    // Fill lead name (company name)
    if (place.name) {
        $('#leadName').val(place.name);
    }

    // Fill phone number if available
    if (place.formatted_phone_number) {
        $('#leadPhone').val(place.formatted_phone_number);
    } else if (place.international_phone_number) {
        $('#leadPhone').val(place.international_phone_number);
    }

    // Note: Email and other fields are not available from Google Places API
    // Users will need to fill those manually
}

