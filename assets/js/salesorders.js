// Sales Orders Management JavaScript

function loadOrders() {
    if (!orgid) return;
    salesApiCall('/api/salesorders?orgid=' + orgid, 'GET', null, function(orders) {
        renderOrdersTable(orders);
    });
}

function renderOrdersTable(orders) {
    var html = '';
    if (orders && orders.length > 0) {
        orders.forEach(function(order) {
            html += '<tr>' +
                   '<td><a href="salesorderdetail.html?id=' + order.orderid + '">' + (order.ordernumber || 'N/A') + '</a></td>' +
                   '<td>' + (order.accountname || 'N/A') + '</td>' +
                   '<td><span class="badge bg-info">' + (order.status || 'Pending') + '</span></td>' +
                   '<td>$' + formatCurrency(order.totalamount) + '</td>' +
                   '<td>' + formatDate(order.orderdate) + '</td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="viewOrder(' + order.orderid + ')"><i class="ri-eye-line"></i></button> ' +
                   '<button class="btn btn-sm btn-success" onclick="convertToContract(' + order.orderid + ')"><i class="ri-file-contract-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="6" class="text-center text-muted">No orders found</td></tr>';
    }
    $('#ordersTableBody').html(html);
}

function viewOrder(orderId) {
    window.location.href = 'salesorderdetail.html?id=' + orderId;
}

function convertToContract(orderId) {
    Swal.fire({
        title: 'Convert to Contract',
        html: '<input type="date" class="form-control mb-2" id="contractStartDate" required />' +
              '<input type="date" class="form-control mb-2" id="contractEndDate" required />' +
              '<input type="date" class="form-control mb-2" id="contractRenewalDate" />' +
              '<select class="form-select" id="contractBillingCycle"><option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Annual">Annual</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Convert',
        preConfirm: function() {
            return {
                startdate: new Date($('#contractStartDate').val()).toISOString(),
                enddate: new Date($('#contractEndDate').val()).toISOString(),
                renewaldate: $('#contractRenewalDate').val() ? new Date($('#contractRenewalDate').val()).toISOString() : null,
                billingcycle: $('#contractBillingCycle').val()
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesorders/' + orderId + '/convert-contract', 'POST', result.value, function(response) {
                showSalesSuccess('Order converted to contract successfully');
                window.location.href = 'salescontractdetail.html?id=' + response.contractid;
            });
        }
    });
}

