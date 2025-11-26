// Sales Quotes Management JavaScript

function loadQuotes(opportunityId) {
    if (!orgid) return;
    var url = '/api/salesquotes?orgid=' + orgid;
    if (opportunityId) url += '&opportunityid=' + opportunityId;
    
    salesApiCall(url, 'GET', null, function(quotes) {
        renderQuotesTable(quotes);
    });
}

function renderQuotesTable(quotes) {
    var html = '';
    if (quotes && quotes.length > 0) {
        quotes.forEach(function(quote) {
            html += '<tr>' +
                   '<td><a href="salesquotedetail.html?id=' + quote.quoteid + '">' + (quote.quotenumber || 'N/A') + '</a></td>' +
                   '<td>' + (quote.accountname || 'N/A') + '</td>' +
                   '<td><span class="badge bg-info">' + (quote.status || 'Draft') + '</span></td>' +
                   '<td>$' + formatCurrency(quote.totalamount) + '</td>' +
                   '<td>' + formatDate(quote.validuntil) + '</td>' +
                   '<td>' + (quote.version || 1) + '</td>' +
                   '<td>' + formatDate(quote.createddate) + '</td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="editQuote(' + quote.quoteid + ')"><i class="ri-edit-line"></i></button> ' +
                   '<button class="btn btn-sm btn-success" onclick="convertToOrder(' + quote.quoteid + ')"><i class="ri-shopping-cart-line"></i></button> ' +
                   '<button class="btn btn-sm btn-danger" onclick="deleteQuote(' + quote.quoteid + ')"><i class="ri-delete-bin-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="8" class="text-center text-muted">No quotes found</td></tr>';
    }
    $('#quotesTableBody').html(html);
}

function showAddQuoteModal() {
    var urlParams = new URLSearchParams(window.location.search);
    var opportunityId = urlParams.get('opportunityid');
    
    Swal.fire({
        title: 'Create New Quote',
        html: '<select class="form-select mb-2" id="quoteOpportunity"><option value="">Select Opportunity</option></select>' +
              '<select class="form-select mb-2" id="quoteAccount"><option value="">Select Account</option></select>' +
              '<input type="date" class="form-control mb-2" id="quoteValidUntil" />',
        showCancelButton: true,
        confirmButtonText: 'Create',
        didOpen: function() {
            loadSalesAccounts('#quoteAccount', orgid);
            if (opportunityId) {
                salesApiCall('/api/salesopportunities/' + opportunityId + '?orgid=' + orgid, 'GET', null, function(opp) {
                    $('#quoteOpportunity').append('<option value="' + opp.opportunityid + '" selected>' + opp.opportunityname + '</option>');
                    $('#quoteAccount').val(opp.accountid).trigger('change');
                });
            }
        },
        preConfirm: function() {
            return {
                orgid: orgid,
                opportunityid: $('#quoteOpportunity').val() ? parseInt($('#quoteOpportunity').val()) : null,
                accountid: $('#quoteAccount').val() ? parseInt($('#quoteAccount').val()) : null,
                validuntil: $('#quoteValidUntil').val() ? new Date($('#quoteValidUntil').val()).toISOString() : null
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesquotes', 'POST', result.value, function(response) {
                showSalesSuccess('Quote created successfully');
                window.location.href = 'salesquotedetail.html?id=' + response.quoteid;
            });
        }
    });
}

function editQuote(quoteId) {
    window.location.href = 'salesquotedetail.html?id=' + quoteId;
}

function convertToOrder(quoteId) {
    confirmSalesAction('Convert this quote to an order?', function() {
        salesApiCall('/api/salesquotes/' + quoteId + '/convert-order', 'POST', null, function(response) {
            showSalesSuccess('Quote converted to order successfully');
            window.location.href = 'salesorderdetail.html?id=' + response.orderid;
        });
    });
}

function deleteQuote(quoteId) {
    confirmSalesAction('Are you sure you want to delete this quote?', function() {
        salesApiCall('/api/salesquotes/' + quoteId + '?orgid=' + orgid, 'DELETE', null, function() {
            showSalesSuccess('Quote deleted successfully');
            loadQuotes();
        });
    });
}

