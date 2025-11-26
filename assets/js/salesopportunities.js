// Sales Opportunities Management JavaScript

function loadOpportunities(accountId) {
    if (currentView === 'kanban') {
        loadOpportunitiesKanban(accountId);
    } else {
        loadOpportunitiesList(accountId);
    }
}

function loadOpportunitiesKanban(accountId) {
    if (!orgid) return;
    var url = '/api/salesopportunities?orgid=' + orgid;
    if (accountId) url += '&accountid=' + accountId;
    
    salesApiCall(url, 'GET', null, function(opportunities) {
        var stages = ['Prospecting', 'Discovery', 'Proposal', 'Negotiation'];
        stages.forEach(function(stage) {
            $('#' + 'stage-' + stage).html('');
        });
        
        if (opportunities && opportunities.length > 0) {
            opportunities.forEach(function(opp) {
                if (stages.includes(opp.stage)) {
                    var card = '<div class="kanban-card" data-oppid="' + opp.opportunityid + '">' +
                              '<strong><a href="salesopportunitydetail.html?id=' + opp.opportunityid + '">' + opp.opportunityname + '</a></strong><br>' +
                              '<small>' + (opp.accountname || 'N/A') + '</small><br>' +
                              '<strong>$' + formatCurrency(opp.amount) + '</strong> (' + (opp.probability || 0) + '%)<br>' +
                              '<small>' + formatDate(opp.closedate) + '</small>' +
                              '</div>';
                    $('#' + 'stage-' + opp.stage).append(card);
                }
            });
        }
        
        // Make cards draggable
        $('.kanban-card').draggable({
            revert: 'invalid',
            cursor: 'move'
        });
        
        $('.kanban-column').droppable({
            accept: '.kanban-card',
            drop: function(event, ui) {
                var oppId = ui.draggable.data('oppid');
                var newStage = $(this).find('h6').text();
                changeOpportunityStage(oppId, newStage);
            }
        });
    });
}

function loadOpportunitiesList(accountId) {
    if (!orgid) return;
    var url = '/api/salesopportunities?orgid=' + orgid;
    if (accountId) url += '&accountid=' + accountId;
    
    salesApiCall(url, 'GET', null, function(opportunities) {
        renderOpportunitiesTable(opportunities);
    });
}

function renderOpportunitiesTable(opportunities) {
    var html = '';
    if (opportunities && opportunities.length > 0) {
        opportunities.forEach(function(opp) {
            html += '<tr>' +
                   '<td><a href="salesopportunitydetail.html?id=' + opp.opportunityid + '">' + (opp.opportunitynumber || 'N/A') + '</a></td>' +
                   '<td>' + (opp.opportunityname || 'N/A') + '</td>' +
                   '<td>' + (opp.accountname || 'N/A') + '</td>' +
                   '<td><span class="badge bg-info">' + (opp.stage || 'N/A') + '</span></td>' +
                   '<td>$' + formatCurrency(opp.amount) + '</td>' +
                   '<td>' + (opp.probability || 0) + '%</td>' +
                   '<td>' + formatDate(opp.closedate) + '</td>' +
                   '<td>' + (opp.ownername || 'Unassigned') + '</td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="editOpportunity(' + opp.opportunityid + ')"><i class="ri-edit-line"></i></button> ' +
                   '<button class="btn btn-sm btn-danger" onclick="deleteOpportunity(' + opp.opportunityid + ')"><i class="ri-delete-bin-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="9" class="text-center text-muted">No opportunities found</td></tr>';
    }
    $('#opportunitiesTableBody').html(html);
}

function showAddOpportunityModal() {
    var urlParams = new URLSearchParams(window.location.search);
    var accountId = urlParams.get('accountid');
    
    Swal.fire({
        title: 'Add New Opportunity',
        html: '<input type="text" class="form-control mb-2" id="oppName" placeholder="Opportunity Name *" required />' +
              '<select class="form-select mb-2" id="oppAccount"><option value="">Select Account</option></select>' +
              '<select class="form-select mb-2" id="oppContact"><option value="">Select Contact</option></select>' +
              '<input type="number" class="form-control mb-2" id="oppAmount" placeholder="Amount" step="0.01" />' +
              '<select class="form-select mb-2" id="oppStage"><option value="Prospecting">Prospecting</option><option value="Discovery">Discovery</option><option value="Proposal">Proposal</option><option value="Negotiation">Negotiation</option></select>' +
              '<input type="number" class="form-control mb-2" id="oppProbability" placeholder="Probability %" min="0" max="100" />' +
              '<input type="date" class="form-control mb-2" id="oppCloseDate" />' +
              '<select class="form-select" id="oppOwner"><option value="">Select Owner</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Save',
        didOpen: function() {
            loadSalesAccounts('#oppAccount', orgid);
            loadSalesUsers('#oppOwner', orgid);
            if (accountId) $('#oppAccount').val(accountId).trigger('change');
        },
        preConfirm: function() {
            return {
                orgid: orgid,
                opportunityname: $('#oppName').val(),
                accountid: $('#oppAccount').val() ? parseInt($('#oppAccount').val()) : null,
                contactid: $('#oppContact').val() ? parseInt($('#oppContact').val()) : null,
                amount: $('#oppAmount').val() ? parseFloat($('#oppAmount').val()) : null,
                stage: $('#oppStage').val(),
                probability: $('#oppProbability').val() ? parseInt($('#oppProbability').val()) : 10,
                closedate: $('#oppCloseDate').val() ? new Date($('#oppCloseDate').val()).toISOString() : null,
                ownerid: $('#oppOwner').val() ? parseInt($('#oppOwner').val()) : null
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesopportunities', 'POST', result.value, function(response) {
                showSalesSuccess('Opportunity created successfully');
                loadOpportunities(accountId);
            });
        }
    });
}

function changeOpportunityStage(oppId, newStage) {
    salesApiCall('/api/salesopportunities/' + oppId + '/stage', 'POST', { stage: newStage }, function(response) {
        showSalesSuccess('Stage updated successfully');
        loadOpportunitiesKanban();
    });
}

function editOpportunity(oppId) {
    window.location.href = 'salesopportunitydetail.html?id=' + oppId;
}

function deleteOpportunity(oppId) {
    confirmSalesAction('Are you sure you want to delete this opportunity?', function() {
        salesApiCall('/api/salesopportunities/' + oppId + '?orgid=' + orgid, 'DELETE', null, function() {
            showSalesSuccess('Opportunity deleted successfully');
            loadOpportunities();
        });
    });
}

