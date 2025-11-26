// Sales Contracts Management JavaScript

function loadContracts() {
    if (!orgid) return;
    salesApiCall('/api/salescontracts?orgid=' + orgid, 'GET', null, function(contracts) {
        renderContractsTable(contracts);
    });
}

function renderContractsTable(contracts) {
    var html = '';
    if (contracts && contracts.length > 0) {
        contracts.forEach(function(contract) {
            html += '<tr>' +
                   '<td><a href="salescontractdetail.html?id=' + contract.contractid + '">' + (contract.contractnumber || 'N/A') + '</a></td>' +
                   '<td>' + (contract.accountname || 'N/A') + '</td>' +
                   '<td>' + formatDate(contract.startdate) + '</td>' +
                   '<td>' + formatDate(contract.enddate) + '</td>' +
                   '<td>' + formatDate(contract.renewaldate) + '</td>' +
                   '<td>' + (contract.billingcycle || 'N/A') + '</td>' +
                   '<td><span class="badge bg-' + (contract.status === 'Active' ? 'success' : 'secondary') + '">' + (contract.status || 'N/A') + '</span></td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="viewContract(' + contract.contractid + ')"><i class="ri-eye-line"></i></button> ' +
                   '<button class="btn btn-sm btn-success" onclick="renewContract(' + contract.contractid + ')"><i class="ri-refresh-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="8" class="text-center text-muted">No contracts found</td></tr>';
    }
    $('#contractsTableBody').html(html);
}

function viewContract(contractId) {
    window.location.href = 'salescontractdetail.html?id=' + contractId;
}

function renewContract(contractId) {
    Swal.fire({
        title: 'Renew Contract',
        html: '<input type="date" class="form-control mb-2" id="renewStartDate" required />' +
              '<input type="date" class="form-control mb-2" id="renewEndDate" required />' +
              '<input type="date" class="form-control mb-2" id="renewRenewalDate" />' +
              '<select class="form-select" id="renewBillingCycle"><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Annual">Annual</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Renew',
        preConfirm: function() {
            return {
                startdate: new Date($('#renewStartDate').val()).toISOString(),
                enddate: new Date($('#renewEndDate').val()).toISOString(),
                renewaldate: $('#renewRenewalDate').val() ? new Date($('#renewRenewalDate').val()).toISOString() : null,
                billingcycle: $('#renewBillingCycle').val()
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salescontracts/' + contractId + '/renew', 'POST', result.value, function(response) {
                showSalesSuccess('Contract renewed successfully');
                loadContracts();
            });
        }
    });
}

function loadRenewals() {
    if (!orgid) return;
    salesApiCall('/api/salescontracts/renewals?orgid=' + orgid + '&daysAhead=90', 'GET', null, function(renewals) {
        renderContractsTable(renewals);
    });
}

