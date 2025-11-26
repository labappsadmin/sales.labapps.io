// Sales Admin Management JavaScript

function loadTerritories() {
    if (!orgid) return;
    salesApiCall('/api/salesadmin/territories?orgid=' + orgid, 'GET', null, function(territories) {
        var html = '<ul class="list-group">';
        if (territories && territories.length > 0) {
            territories.forEach(function(territory) {
                html += '<li class="list-group-item d-flex justify-content-between align-items-center">' +
                       '<div><strong>' + territory.territoryname + '</strong><br><small>' + territory.region + '</small></div>' +
                       '<span class="badge bg-primary">' + (territory.ownername || 'Unassigned') + '</span></li>';
            });
        } else {
            html += '<li class="list-group-item text-muted">No territories</li>';
        }
        html += '</ul>';
        $('#territoriesList').html(html);
    });
}

function loadScoringRules() {
    if (!orgid) return;
    salesApiCall('/api/salesadmin/lead-scoring-rules?orgid=' + orgid, 'GET', null, function(rules) {
        var html = '<ul class="list-group">';
        if (rules && rules.length > 0) {
            rules.forEach(function(rule) {
                html += '<li class="list-group-item"><strong>' + rule.rulename + '</strong><br>' +
                       '<small>' + rule.fieldname + ' ' + rule.condition + ' ' + rule.conditionvalue + ' = ' + rule.score + ' points</small></li>';
            });
        } else {
            html += '<li class="list-group-item text-muted">No scoring rules</li>';
        }
        html += '</ul>';
        $('#scoringRulesList').html(html);
    });
}

function showAddTerritoryModal() {
    Swal.fire({
        title: 'Add New Territory',
        html: '<input type="text" class="form-control mb-2" id="territoryName" placeholder="Territory Name *" required />' +
              '<input type="text" class="form-control mb-2" id="territoryRegion" placeholder="Region" />' +
              '<select class="form-select" id="territoryOwner"><option value="">Select Owner</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Save',
        didOpen: function() {
            loadSalesUsers('#territoryOwner', orgid);
        },
        preConfirm: function() {
            return {
                orgid: orgid,
                territoryname: $('#territoryName').val(),
                region: $('#territoryRegion').val(),
                ownerid: $('#territoryOwner').val() ? parseInt($('#territoryOwner').val()) : null
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesadmin/territories', 'POST', result.value, function(response) {
                showSalesSuccess('Territory created successfully');
                loadTerritories();
            });
        }
    });
}

function showAddScoringRuleModal() {
    Swal.fire({
        title: 'Add Lead Scoring Rule',
        html: '<input type="text" class="form-control mb-2" id="ruleName" placeholder="Rule Name *" required />' +
              '<input type="text" class="form-control mb-2" id="ruleField" placeholder="Field Name" />' +
              '<select class="form-select mb-2" id="ruleCondition"><option value="equals">Equals</option><option value="contains">Contains</option><option value="startswith">Starts With</option></select>' +
              '<input type="text" class="form-control mb-2" id="ruleValue" placeholder="Condition Value" />' +
              '<input type="number" class="form-control" id="ruleScore" placeholder="Score Points" />',
        showCancelButton: true,
        confirmButtonText: 'Save',
        preConfirm: function() {
            return {
                orgid: orgid,
                rulename: $('#ruleName').val(),
                fieldname: $('#ruleField').val(),
                condition: $('#ruleCondition').val(),
                conditionvalue: $('#ruleValue').val(),
                score: $('#ruleScore').val() ? parseInt($('#ruleScore').val()) : 0
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesadmin/lead-scoring-rules', 'POST', result.value, function(response) {
                showSalesSuccess('Scoring rule created successfully');
                loadScoringRules();
            });
        }
    });
}

