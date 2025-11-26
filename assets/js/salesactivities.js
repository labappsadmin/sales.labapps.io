// Sales Activities Management JavaScript

function loadActivities() {
    if (!orgid) return;
    salesApiCall('/api/salesactivities?orgid=' + orgid, 'GET', null, function(activities) {
        renderActivitiesTable(activities);
    });
}

function renderActivitiesTable(activities) {
    var html = '';
    if (activities && activities.length > 0) {
        activities.forEach(function(activity) {
            html += '<tr>' +
                   '<td><span class="badge bg-info">' + (activity.activitytype || 'N/A') + '</span></td>' +
                   '<td>' + (activity.subject || 'N/A') + '</td>' +
                   '<td>' + (activity.relatedtoname || 'N/A') + '</td>' +
                   '<td>' + (activity.assignedtoname || 'Unassigned') + '</td>' +
                   '<td>' + formatDate(activity.duedate) + '</td>' +
                   '<td><span class="badge bg-' + (activity.status === 'Completed' ? 'success' : 'warning') + '">' + (activity.status || 'N/A') + '</span></td>' +
                   '<td><span class="badge bg-' + (activity.priority === 'High' ? 'danger' : activity.priority === 'Medium' ? 'warning' : 'secondary') + '">' + (activity.priority || 'Normal') + '</span></td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="editActivity(' + activity.activityid + ')"><i class="ri-edit-line"></i></button> ' +
                   '<button class="btn btn-sm btn-danger" onclick="deleteActivity(' + activity.activityid + ')"><i class="ri-delete-bin-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="8" class="text-center text-muted">No activities found</td></tr>';
    }
    $('#activitiesTableBody').html(html);
}

function showAddActivityModal() {
    Swal.fire({
        title: 'Add New Activity',
        html: '<select class="form-select mb-2" id="activityType"><option value="Task">Task</option><option value="Call">Call</option><option value="Meeting">Meeting</option></select>' +
              '<input type="text" class="form-control mb-2" id="activitySubject" placeholder="Subject *" required />' +
              '<textarea class="form-control mb-2" id="activityDescription" placeholder="Description"></textarea>' +
              '<select class="form-select mb-2" id="activityRelatedType"><option value="Lead">Lead</option><option value="Account">Account</option><option value="Contact">Contact</option><option value="Opportunity">Opportunity</option></select>' +
              '<input type="number" class="form-control mb-2" id="activityRelatedId" placeholder="Related ID" />' +
              '<input type="datetime-local" class="form-control mb-2" id="activityDueDate" />' +
              '<select class="form-select mb-2" id="activityPriority"><option value="Normal">Normal</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>' +
              '<select class="form-select" id="activityAssignedTo"><option value="">Select User</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Save',
        didOpen: function() {
            loadSalesUsers('#activityAssignedTo', orgid);
        },
        preConfirm: function() {
            return {
                orgid: orgid,
                activitytype: $('#activityType').val(),
                subject: $('#activitySubject').val(),
                description: $('#activityDescription').val(),
                relatedtotype: $('#activityRelatedType').val(),
                relatedtoid: $('#activityRelatedId').val() ? parseInt($('#activityRelatedId').val()) : null,
                duedate: $('#activityDueDate').val() ? new Date($('#activityDueDate').val()).toISOString() : null,
                priority: $('#activityPriority').val(),
                assignedto: $('#activityAssignedTo').val() ? parseInt($('#activityAssignedTo').val()) : null
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesactivities', 'POST', result.value, function(response) {
                showSalesSuccess('Activity created successfully');
                loadActivities();
            });
        }
    });
}

function editActivity(activityId) {
    window.location.href = 'salesactivitydetail.html?id=' + activityId;
}

function deleteActivity(activityId) {
    confirmSalesAction('Are you sure you want to delete this activity?', function() {
        salesApiCall('/api/salesactivities/' + activityId + '?orgid=' + orgid, 'DELETE', null, function() {
            showSalesSuccess('Activity deleted successfully');
            loadActivities();
        });
    });
}

function loadCalendarView() {
    if (!orgid) return;
    salesApiCall('/api/salesactivities/calendar?orgid=' + orgid + '&view=month', 'GET', null, function(activities) {
        // Render calendar view
        $('#calendarContent').html('<p class="text-muted">Calendar view with ' + (activities ? activities.length : 0) + ' activities</p>');
    });
}

