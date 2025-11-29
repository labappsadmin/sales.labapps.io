// Sales Accounts Management JavaScript

var currentPage = 1;
var pageSize = 25;
var currentSortColumn = null;
var currentSortDirection = 'asc';
var currentFilters = {};
var allAccounts = [];
var filteredAccounts = [];
var filtersInitialized = false;

function loadAccounts() {
    if (!orgid) return;
    salesApiCall('/api/salesaccounts?orgid=' + orgid, 'GET', null, function(accounts) {
        allAccounts = accounts || [];
        if (!filtersInitialized) {
            initializeFilters();
            filtersInitialized = true;
        } else {
            updateFilterOptions();
        }
        applyFiltersAndRender();
    });
}

function applyFiltersAndRender() {
    filteredAccounts = [...allAccounts];
    
    // Apply filters
    if (currentFilters.owner && currentFilters.owner !== '') {
        filteredAccounts = filteredAccounts.filter(function(acc) {
            return acc.ownerid && acc.ownerid.toString() === currentFilters.owner.toString();
        });
    }
    
    if (currentFilters.accountType && currentFilters.accountType !== '') {
        filteredAccounts = filteredAccounts.filter(function(acc) {
            return acc.accounttype === currentFilters.accountType;
        });
    }
    
    if (currentFilters.industry && currentFilters.industry !== '') {
        filteredAccounts = filteredAccounts.filter(function(acc) {
            return acc.industry === currentFilters.industry;
        });
    }
    
    if (currentFilters.region && currentFilters.region !== '') {
        filteredAccounts = filteredAccounts.filter(function(acc) {
            return acc.region === currentFilters.region;
        });
    }
    
    if (currentFilters.status && currentFilters.status !== '') {
        filteredAccounts = filteredAccounts.filter(function(acc) {
            return acc.status === currentFilters.status;
        });
    }
    
    // Apply search
    var searchTerm = $('#tappsearch').val().toLowerCase();
    if (searchTerm) {
        filteredAccounts = filteredAccounts.filter(function(acc) {
            return (acc.accountname && acc.accountname.toLowerCase().includes(searchTerm)) ||
                   (acc.accountnumber && acc.accountnumber.toLowerCase().includes(searchTerm)) ||
                   (acc.industry && acc.industry.toLowerCase().includes(searchTerm)) ||
                   (acc.region && acc.region.toLowerCase().includes(searchTerm));
        });
    }
    
    // Apply sorting
    if (currentSortColumn) {
        filteredAccounts.sort(function(a, b) {
            var aVal = a[currentSortColumn] || '';
            var bVal = b[currentSortColumn] || '';
            
            if (currentSortColumn === 'annualrevenue') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (currentSortColumn === 'createddate') {
                aVal = new Date(aVal || 0);
                bVal = new Date(bVal || 0);
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }
            
            if (currentSortDirection === 'asc') {
                return aVal > bVal ? 1 : (aVal < bVal ? -1 : 0);
            } else {
                return aVal < bVal ? 1 : (aVal > bVal ? -1 : 0);
            }
        });
    }
    
    renderAccountsTable();
}

function sortTable(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    // Update sort indicators
    $('.sort-indicator').html('');
    var indicator = currentSortDirection === 'asc' ? '↑' : '↓';
    $('#sort_' + column).html(indicator);
    
    applyFiltersAndRender();
}

function renderAccountsTable() {
    var html = '';
    var totalRecords = filteredAccounts.length;
    var totalPages = Math.ceil(totalRecords / pageSize);
    var startIndex = (currentPage - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, totalRecords);
    var pageAccounts = filteredAccounts.slice(startIndex, endIndex);
    
    // Update results count
    $('#resultsCount').text('Showing ' + (startIndex + 1) + '-' + endIndex + ' of ' + totalRecords + ' accounts');
    
    // Render pagination
    renderPagination(totalPages);
    
    if (pageAccounts && pageAccounts.length > 0) {
        pageAccounts.forEach(function(account) {
            var accountType = account.accounttype || '—';
            var status = account.status || 'Prospect';
            var statusLower = status.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
            var statusClass = 'status-' + statusLower;
            // Default to prospect style if status class doesn't exist
            if (!['active', 'prospect', 'onboarding', 'atrisk', 'inactive'].includes(statusLower)) {
                statusClass = 'status-prospect';
            }
            var statusBadge = '<span class="status-badge ' + statusClass + '">' + status + '</span>';
            
            var lastActivity = account.lastactivitydate ? formatRelativeDate(account.lastactivitydate) : 'No activity';
            var openOpps = account.openopportunitiescount || 0;
            var oppsDisplay = openOpps > 0 ? 
                '<a href="salesopportunities.html?accountid=' + account.accountid + '" class="opportunity-link">' + openOpps + ' Open</a>' : 
                '0';
            
            html += '<tr>' +
                   '<td><a href="salesaccountdetail.html?id=' + account.accountid + '">' + (account.accountnumber || '—') + '</a></td>' +
                   '<td>' + (account.accountname || '—') + '</td>' +
                   '<td>' + accountType + '</td>' +
                   '<td>' + (account.industry || '—') + '</td>' +
                   '<td>' + (account.region || '—') + '</td>' +
                   '<td>' + statusBadge + '</td>' +
                   '<td>' + (account.ownername || 'Unassigned') + '</td>' +
                   '<td>' + lastActivity + '</td>' +
                   '<td>' + oppsDisplay + '</td>' +
                   '<td>$' + formatCurrency(account.annualrevenue) + '</td>' +
                   '<td>' + formatDate(account.createddate) + 
                   '<span class="action-icons float-end">' +
                   '<a href="javascript:void(0)" class="edit-icon" onclick="editAccount(' + account.accountid + ')" title="Edit"><i class="ri-edit-line"></i></a>' +
                   '<a href="javascript:void(0)" class="delete-icon" onclick="deleteAccount(' + account.accountid + ')" title="Delete"><i class="ri-delete-bin-line"></i></a>' +
                   '</span></td></tr>';
        });
    } else {
        html = '<tr><td colspan="11" class="text-center text-muted py-4">No accounts found</td></tr>';
    }
    $('#accountsTableBody').html(html);
}

function renderPagination(totalPages) {
    var html = '';
    if (totalPages <= 1) {
        $('#paginationContainer').html('');
        return;
    }
    
    // Previous button
    html += '<li class="page-item' + (currentPage === 1 ? ' disabled' : '') + '">' +
            '<a class="page-link" href="javascript:void(0)" onclick="goToPage(' + (currentPage - 1) + ')">Previous</a>' +
            '</li>';
    
    // Page numbers
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += '<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="goToPage(1)">1</a></li>';
        if (startPage > 2) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    for (var i = startPage; i <= endPage; i++) {
        html += '<li class="page-item' + (i === currentPage ? ' active' : '') + '">' +
                '<a class="page-link" href="javascript:void(0)" onclick="goToPage(' + i + ')">' + i + '</a>' +
                '</li>';
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
        html += '<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="goToPage(' + totalPages + ')">' + totalPages + '</a></li>';
    }
    
    // Next button
    html += '<li class="page-item' + (currentPage === totalPages ? ' disabled' : '') + '">' +
            '<a class="page-link" href="javascript:void(0)" onclick="goToPage(' + (currentPage + 1) + ')">Next</a>' +
            '</li>';
    
    $('#paginationContainer').html(html);
}

function goToPage(page) {
    var totalPages = Math.ceil(filteredAccounts.length / pageSize);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderAccountsTable();
        // Scroll to top of table
        $('.table-responsive').scrollTop(0);
    }
}

function changePageSize() {
    pageSize = parseInt($('#pageSizeSelect').val());
    currentPage = 1;
    applyFiltersAndRender();
}

function formatRelativeDate(dateString) {
    if (!dateString) return 'No activity';
    var date = new Date(dateString);
    var now = new Date();
    var diffMs = now - date;
    var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return diffDays + ' days ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
    if (diffDays < 365) return Math.floor(diffDays / 30) + ' months ago';
    return Math.floor(diffDays / 365) + ' years ago';
}

function showAddAccountModal() {
    $('#formAddAccount')[0].reset();
    $('#accountOwner').val(null).trigger('change');
    $('#accountType').val(null).trigger('change');
    $('#accountStatus').val(null).trigger('change');
    loadSalesUsers('#accountOwner', orgid);
    $('#accountOwner').select2({
        dropdownParent: $('#modalAddAccount')
    });
    $('#accountType').select2({
        dropdownParent: $('#modalAddAccount')
    });
    $('#accountStatus').select2({
        dropdownParent: $('#modalAddAccount')
    });
    $('#modalAddAccount .modal-title').text('Add New Account');
    $('#modalAddAccount').modal('show');
}

function saveAccount() {
    if (!$('#accountName').val()) {
        showSalesError('Account Name is required');
        return;
    }
    
    var accountData = {
        orgid: orgid,
        accountname: $('#accountName').val(),
        accounttype: $('#accountType').val() || null,
        industry: $('#accountIndustry').val() || null,
        region: $('#accountRegion').val() || null,
        status: $('#accountStatus').val() || null,
        annualrevenue: $('#accountRevenue').val() ? parseFloat($('#accountRevenue').val()) : null,
        ownerid: $('#accountOwner').val() ? parseInt($('#accountOwner').val()) : null
    };
    
    salesApiCall('/api/salesaccounts', 'POST', accountData, function(response) {
        showSalesSuccess('Account created successfully');
        $('#modalAddAccount').modal('hide');
        loadAccounts();
    });
}

function editAccount(accountId) {
    window.location.href = 'salesaccountdetail.html?id=' + accountId;
}

function deleteAccount(accountId) {
    confirmSalesAction('Are you sure you want to delete this account?', function() {
        salesApiCall('/api/salesaccounts/' + accountId + '?orgid=' + orgid, 'DELETE', null, function() {
            showSalesSuccess('Account deleted successfully');
            loadAccounts();
        });
    });
}

function toggleFilters() {
    var filtersSection = $('#filtersSection');
    if (filtersSection.is(':visible')) {
        filtersSection.slideUp();
    } else {
        filtersSection.slideDown();
    }
}

function resetFilters() {
    $('#filterOwner').val('').trigger('change');
    $('#filterAccountType').val('').trigger('change');
    $('#filterIndustry').val('').trigger('change');
    $('#filterRegion').val('').trigger('change');
    $('#filterStatus').val('').trigger('change');
    currentFilters = {};
    updateFilterCount();
    currentPage = 1;
    applyFiltersAndRender();
}

function updateFilterCount() {
    var count = 0;
    if (currentFilters.owner) count++;
    if (currentFilters.accountType) count++;
    if (currentFilters.industry) count++;
    if (currentFilters.region) count++;
    if (currentFilters.status) count++;
    
    var filterCountBadge = $('#filterCount');
    if (count > 0) {
        filterCountBadge.text(count).show();
    } else {
        filterCountBadge.hide();
    }
}

function initializeFilters() {
    // Load owners for filter
    loadSalesUsers('#filterOwner', orgid);
    
    updateFilterOptions();
    
    // Initialize Select2 for filter dropdowns
    $('#filterOwner').select2({
        placeholder: 'All Owners',
        allowClear: true
    });
    $('#filterAccountType').select2({
        placeholder: 'All Types',
        allowClear: true
    });
    $('#filterIndustry').select2({
        placeholder: 'All Industries',
        allowClear: true
    });
    $('#filterRegion').select2({
        placeholder: 'All Regions',
        allowClear: true
    });
    $('#filterStatus').select2({
        placeholder: 'All Statuses',
        allowClear: true
    });
    
    // Filter change handlers
    $('#filterOwner').on('change', function() {
        currentFilters.owner = $(this).val();
        updateFilterCount();
        currentPage = 1;
        applyFiltersAndRender();
    });
    
    $('#filterAccountType').on('change', function() {
        currentFilters.accountType = $(this).val();
        updateFilterCount();
        currentPage = 1;
        applyFiltersAndRender();
    });
    
    $('#filterIndustry').on('change', function() {
        currentFilters.industry = $(this).val();
        updateFilterCount();
        currentPage = 1;
        applyFiltersAndRender();
    });
    
    $('#filterRegion').on('change', function() {
        currentFilters.region = $(this).val();
        updateFilterCount();
        currentPage = 1;
        applyFiltersAndRender();
    });
    
    $('#filterStatus').on('change', function() {
        currentFilters.status = $(this).val();
        updateFilterCount();
        currentPage = 1;
        applyFiltersAndRender();
    });
    
    // Search handler
    $('#tappsearch').on('keyup', function() {
        currentPage = 1;
        applyFiltersAndRender();
    });
}

function updateFilterOptions() {
    // Load unique industries and regions from accounts
    var industries = [];
    var regions = [];
    allAccounts.forEach(function(acc) {
        if (acc.industry && industries.indexOf(acc.industry) === -1) {
            industries.push(acc.industry);
        }
        if (acc.region && regions.indexOf(acc.region) === -1) {
            regions.push(acc.region);
        }
    });
    
    industries.sort();
    regions.sort();
    
    var industryHtml = '<option value="">All Industries</option>';
    industries.forEach(function(ind) {
        industryHtml += '<option value="' + ind + '">' + ind + '</option>';
    });
    var currentIndustry = $('#filterIndustry').val();
    $('#filterIndustry').html(industryHtml);
    if (currentIndustry) $('#filterIndustry').val(currentIndustry).trigger('change');
    
    var regionHtml = '<option value="">All Regions</option>';
    regions.forEach(function(reg) {
        regionHtml += '<option value="' + reg + '">' + reg + '</option>';
    });
    var currentRegion = $('#filterRegion').val();
    $('#filterRegion').html(regionHtml);
    if (currentRegion) $('#filterRegion').val(currentRegion).trigger('change');
}

