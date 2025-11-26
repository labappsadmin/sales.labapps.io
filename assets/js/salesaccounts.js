// Sales Accounts Management JavaScript

function loadAccounts() {
    if (!orgid) return;
    salesApiCall('/api/salesaccounts?orgid=' + orgid, 'GET', null, function(accounts) {
        renderAccountsTable(accounts);
    });
}

function renderAccountsTable(accounts) {
    var html = '';
    if (accounts && accounts.length > 0) {
        accounts.forEach(function(account) {
            html += '<tr>' +
                   '<td><a href="salesaccountdetail.html?id=' + account.accountid + '">' + (account.accountnumber || 'N/A') + '</a></td>' +
                   '<td>' + (account.accountname || 'N/A') + '</td>' +
                   '<td>' + (account.industry || 'N/A') + '</td>' +
                   '<td>' + (account.region || 'N/A') + '</td>' +
                   '<td>$' + formatCurrency(account.annualrevenue) + '</td>' +
                   '<td>' + (account.ownername || 'Unassigned') + '</td>' +
                   '<td>' + formatDate(account.createddate) + '</td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="editAccount(' + account.accountid + ')"><i class="ri-edit-line"></i></button> ' +
                   '<button class="btn btn-sm btn-danger" onclick="deleteAccount(' + account.accountid + ')"><i class="ri-delete-bin-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="8" class="text-center text-muted">No accounts found</td></tr>';
    }
    $('#accountsTableBody').html(html);
}

function showAddAccountModal() {
    Swal.fire({
        title: 'Add New Account',
        html: '<input type="text" class="form-control mb-2" id="accountName" placeholder="Account Name *" required />' +
              '<input type="text" class="form-control mb-2" id="accountIndustry" placeholder="Industry" />' +
              '<input type="text" class="form-control mb-2" id="accountRegion" placeholder="Region" />' +
              '<input type="number" class="form-control mb-2" id="accountRevenue" placeholder="Annual Revenue" />' +
              '<select class="form-select" id="accountOwner"><option value="">Select Owner</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Save',
        didOpen: function() {
            loadSalesUsers('#accountOwner', orgid);
        },
        preConfirm: function() {
            return {
                orgid: orgid,
                accountname: $('#accountName').val(),
                industry: $('#accountIndustry').val(),
                region: $('#accountRegion').val(),
                annualrevenue: $('#accountRevenue').val() ? parseFloat($('#accountRevenue').val()) : null,
                ownerid: $('#accountOwner').val() ? parseInt($('#accountOwner').val()) : null
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesaccounts', 'POST', result.value, function(response) {
                showSalesSuccess('Account created successfully');
                loadAccounts();
            });
        }
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

