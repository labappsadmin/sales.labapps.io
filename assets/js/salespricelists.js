// Sales Price Lists Management JavaScript

function loadPriceLists() {
    if (!orgid) return;
    salesApiCall('/api/salespricelists?orgid=' + orgid, 'GET', null, function(priceLists) {
        renderPriceListsTable(priceLists);
    });
}

function renderPriceListsTable(priceLists) {
    var html = '';
    if (priceLists && priceLists.length > 0) {
        priceLists.forEach(function(priceList) {
            html += '<tr>' +
                   '<td><a href="salespricelistdetail.html?id=' + priceList.pricelistid + '">' + (priceList.pricelistname || 'N/A') + '</a></td>' +
                   '<td>' + (priceList.region || 'N/A') + '</td>' +
                   '<td>' + formatDate(priceList.effectivedate) + '</td>' +
                   '<td>' + formatDate(priceList.expirydate) + '</td>' +
                   '<td><span class="badge bg-' + (priceList.isactive ? 'success' : 'secondary') + '">' + (priceList.isactive ? 'Active' : 'Inactive') + '</span></td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="editPriceList(' + priceList.pricelistid + ')"><i class="ri-edit-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="6" class="text-center text-muted">No price lists found</td></tr>';
    }
    $('#priceListsTableBody').html(html);
}

function showAddPriceListModal() {
    Swal.fire({
        title: 'Create New Price List',
        html: '<input type="text" class="form-control mb-2" id="priceListName" placeholder="Price List Name *" required />' +
              '<input type="text" class="form-control mb-2" id="priceListRegion" placeholder="Region" />' +
              '<input type="date" class="form-control mb-2" id="priceListEffectiveDate" />' +
              '<input type="date" class="form-control mb-2" id="priceListExpiryDate" />',
        showCancelButton: true,
        confirmButtonText: 'Create',
        preConfirm: function() {
            return {
                orgid: orgid,
                pricelistname: $('#priceListName').val(),
                region: $('#priceListRegion').val(),
                effectivedate: $('#priceListEffectiveDate').val() ? new Date($('#priceListEffectiveDate').val()).toISOString() : null,
                expirydate: $('#priceListExpiryDate').val() ? new Date($('#priceListExpiryDate').val()).toISOString() : null,
                isactive: true
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salespricelists', 'POST', result.value, function(response) {
                showSalesSuccess('Price list created successfully');
                window.location.href = 'salespricelistdetail.html?id=' + response.pricelistid;
            });
        }
    });
}

function editPriceList(priceListId) {
    window.location.href = 'salespricelistdetail.html?id=' + priceListId;
}

