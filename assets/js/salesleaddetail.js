// Sales Lead Detail Page JavaScript

var currentLeadId = null;
var currentLeadData = null;
var previousLeadState = null; // Track previous state to detect changes
var isGeneratingNextSteps = false; // Flag to prevent concurrent generations
var lastNextStepsRegeneration = 0; // Timestamp of last regeneration to prevent rapid calls
var currentActivities = []; // Store current activities for AI analysis

function initializeLeadDetailPage() {
    var urlParams = new URLSearchParams(window.location.search);
    currentLeadId = urlParams.get('id');
    if (currentLeadId && orgid) {
        loadLeadDetails(currentLeadId);
    }
}

function loadLeadDetails(leadId) {
    showFooterStatus('Loading lead details...', true);
    salesApiCall('/api/salesleads/' + leadId + '?orgid=' + orgid, 'GET', null, function(lead) {
        showFooterStatus('Lead details loaded', false);
        currentLeadData = lead;
        
        // Update page title
        document.title = (lead.leadname || 'Lead Details') + ' - Sales Module';
        
        // Header info
        $('#leadNumber').text(lead.leadnumber || '-');
        $('#leadName').text(lead.leadname || '-');
        $('#leadEmail').text(lead.email || '-');
        $('#leadPhone').text(lead.phone || '-');
        $('#leadSource').text(lead.source || '-');
        $('#leadSegment').text(lead.segment || '-');
        $('#leadAssignedTo').text(lead.assignedtoname || 'Unassigned');
        $('#leadTerritory').text(lead.territoryname || '-');
        
        // Status badge
        var statusClass = 'badge-primary';
        if (lead.status === 'Converted') statusClass = 'badge-success';
        else if (lead.status === 'Lost') statusClass = 'badge-danger';
        else if (lead.status === 'Qualified') statusClass = 'badge-info';
        else if (lead.status === 'Contacted') statusClass = 'badge-warning';
        $('#leadStatus').removeClass('badge-primary badge-success badge-danger badge-info badge-warning')
            .addClass(statusClass).text(lead.status || 'New');
        
        // Score badge
        $('#leadScore').text('Score: ' + (lead.score || 0));
        
        // Update convert button based on status
        $('#btnConvertLead').off('click'); // Remove existing handlers
        if (lead.status === 'Lost') {
            // Show Re-Instate button for lost leads
            $('#btnConvertLead').show()
                .html('<i class="ri-refresh-line"></i> Re-Instate')
                .on('click', function() {
                    reinstateLead();
                });
        } else {
            $('#btnConvertLead').on('click', function() {
                convertLeadFromDetail();
            });
            if (lead.status === 'Converted') {
                $('#btnConvertLead').html('<i class="ri-add-line"></i> Opportunity');
            } else {
                $('#btnConvertLead').html('<i class="ri-exchange-line"></i> Convert');
            }
        }
        
        // Update footer status buttons
        updateFooterStatusButtons(lead.status);
        
        // Separate notes from attributes and render
        var notes = [];
        var attributes = {};
        
        if (lead.attributes) {
            // Check for LeadNotes attribute (JSON array)
            if (lead.attributes.LeadNotes) {
                try {
                    var notesValue = lead.attributes.LeadNotes;
                    if (notesValue && notesValue.trim() !== '' && notesValue !== 'null') {
                        notes = JSON.parse(notesValue);
                        if (!Array.isArray(notes)) {
                            notes = [];
                        }
                    }
                } catch (e) {
                    console.error('Error parsing LeadNotes:', e);
                    notes = [];
                }
            }
            
            // All other attributes (excluding LeadNotes and NextSteps)
            for (var key in lead.attributes) {
                if (key !== 'LeadNotes' && key !== 'NextSteps') {
                    attributes[key] = lead.attributes[key];
                }
            }
        }
        
        renderNotes(notes);
        renderAttributes(attributes);
        
        // Store current state for change detection BEFORE loading next steps
        // This prevents loops by having the state ready for comparison
        previousLeadState = {
            status: lead.status,
            attributesHash: JSON.stringify(attributes),
            notesHash: JSON.stringify(notes),
            activitiesCount: 0 // Will be updated when activities load
        };
        
        // Load activities first, then load next steps
        loadActivities(leadId);
        
        // Load and check Next Steps (after state is set)
        // Use a small delay to ensure activities have started loading
        setTimeout(function() {
            loadNextSteps(lead, notes, attributes);
        }, 100);
    }, function(error) {
        showFooterStatus('Failed to load lead details', false);
    });
}

function renderNotes(notes) {
    // Always show the Notes card so users can add notes
    $('#notesCard').show();
    
    if (notes && Array.isArray(notes) && notes.length > 0) {
        // Sort notes by date (newest first)
        notes.sort(function(a, b) {
            var dateA = new Date(a.noteaddeddate || 0);
            var dateB = new Date(b.noteaddeddate || 0);
            return dateB - dateA;
        });
        
        var notesHtml = '';
        notes.forEach(function(note, index) {
            var author = (note.noteaddedby || 'Unknown User').replace(/"/g, '');
            var content = note.notecontent || '';
            var title = note.notetitle || '';
            var date = note.noteaddeddate || new Date().toISOString();
            var timeAgo = '';
            try {
                if (typeof getTimeAgoInUserTimezone === 'function') {
                    timeAgo = getTimeAgoInUserTimezone(date);
                } else if (typeof formatDateInUserTimezone === 'function') {
                    timeAgo = formatDateInUserTimezone(date, 'datetime');
                } else if (typeof formatDate === 'function') {
                    timeAgo = formatDate(date);
                } else {
                    timeAgo = new Date(date).toLocaleString();
                }
            } catch (e) {
                timeAgo = new Date(date).toLocaleString();
            }
            
            notesHtml += '<div class="mb-3 p-3 border rounded note-item" style="background: #f8f9fa;" data-note-index="' + index + '">' +
                '<div class="d-flex justify-content-between align-items-start mb-2">' +
                '<div class="flex-grow-1">' +
                (title ? '<h6 class="mb-1 fw-semibold">' + escapeHtml(title) + '</h6>' : '') +
                '<div class="d-flex align-items-center mb-2">' +
                '<span class="text-muted small me-2"><strong>' + escapeHtml(author) + '</strong></span>' +
                '<span class="text-muted small">' + timeAgo + '</span>' +
                '</div>' +
                '</div>' +
                '<span class="attr-actions">' +
                '<a href="#" class="edit-icon me-2 edit-note-btn" title="Edit"><i class="ri-edit-line"></i></a>' +
                '<a href="#" class="delete-icon delete-note-btn" title="Delete"><i class="ri-delete-bin-line"></i></a>' +
                '</span></div>' +
                '<p class="mb-0 text-muted" style="white-space: pre-wrap;">' + escapeHtml(content) + '</p>' +
                '</div>';
        });
        $('#leadNotes').html(notesHtml);
        
        // Attach event handlers
        $('.edit-note-btn').on('click', function(e) {
            e.preventDefault();
            var noteItem = $(this).closest('.note-item');
            var noteIndex = parseInt(noteItem.data('note-index'));
            var note = notes[noteIndex];
            if (note) {
                editNote(noteIndex, note);
            }
        });
        
        $('.delete-note-btn').on('click', function(e) {
            e.preventDefault();
            var noteIndex = parseInt($(this).closest('.note-item').data('note-index'));
            deleteNote(noteIndex);
        });
    } else {
        $('#leadNotes').html('<div class="text-center py-3"><p class="text-muted mb-0">No notes yet. Click "Add Note" to create one.</p></div>');
    }
}

function renderAttributes(attributes) {
    if (attributes && Object.keys(attributes).length > 0) {
        var attrsHtml = '';
        for (var key in attributes) {
            // Store the value in a data attribute for easy retrieval
            var value = attributes[key];
            attrsHtml += '<div class="row mb-2 align-items-center attr-row" data-attr-key="' + escapeHtml(key) + '" data-attr-value="' + escapeHtml(value) + '">' +
                '<div class="col-md-4 align-top"><strong>' + escapeHtml(key) + ':</strong></div>' +
                '<div class="col-md-8">' + escapeHtml(value) +
                '<span class="attr-actions float-end">' +
                '<a href="#" class="edit-icon edit-attr-btn" title="Edit"><i class="ri-edit-line"></i></a>' +
                '<a href="#" class="delete-icon delete-attr-btn" title="Delete"><i class="ri-delete-bin-line"></i></a>' +
                '</span></div></div>';
        }
        $('#leadAttributes').html(attrsHtml);
        
        // Attach event handlers for attributes
        $('.edit-attr-btn').on('click', function(e) {
            e.preventDefault();
            var attrRow = $(this).closest('.attr-row');
            var key = attrRow.data('attr-key');
            var value = attrRow.data('attr-value');
            editAttribute(key, value);
        });
        
        $('.delete-attr-btn').on('click', function(e) {
            e.preventDefault();
            var key = $(this).closest('.attr-row').data('attr-key');
            deleteAttribute(key);
        });
    } else {
        $('#leadAttributes').html('<p class="text-muted">No additional attributes</p>');
    }
}

function loadActivities(leadId) {
    if (!leadId) {
        $('#leadActivities').html('<p class="text-muted">No activities available</p>');
        return;
    }
    
    showFooterStatus('Loading activities...', true);
    
    // Try to fetch activities from the lead-specific endpoint first
    salesApiCall('/api/salesleads/' + leadId + '/activities?orgid=' + orgid, 'GET', null, function(activities) {
        showFooterStatus('', false);
        renderActivitiesList(activities);
    }, function(error) {
        // If that doesn't work, fetch all activities and filter by relatedtoid
        salesApiCall('/api/salesactivities?orgid=' + orgid, 'GET', null, function(allActivities) {
            showFooterStatus('', false);
            // Filter activities related to this lead
            var filteredActivities = [];
            if (allActivities && Array.isArray(allActivities)) {
                filteredActivities = allActivities.filter(function(activity) {
                    return activity.relatedtotype === 'Lead' && 
                           (activity.relatedtoid === parseInt(leadId) || activity.relatedto_id === parseInt(leadId));
                });
            }
            renderActivitiesList(filteredActivities);
        }, function(error2) {
            showFooterStatus('', false);
            console.error('Error loading activities:', error2);
            $('#leadActivities').html('<div class="text-center text-danger py-3"><i class="ri-error-warning-line"></i><br/>Failed to load activities. Please try again.</div>');
        });
    });
}

function renderActivitiesList(activities) {
    // Store activities globally for AI analysis
    currentActivities = activities || [];
    
    var activitiesCount = currentActivities.length;
    
    // Update activities count in previous state (but don't trigger regeneration automatically)
    // Regeneration should only happen on user actions, not on data loads
    if (previousLeadState) {
        previousLeadState.activitiesCount = activitiesCount;
    }
    
    if (!activities || activities.length === 0) {
        $('#leadActivities').html('<div class="text-center text-muted py-3"><i class="ri-calendar-todo-line"></i><br/>No activities found for this lead.</div>');
        return;
    }
    
    // Sort by due date (upcoming first, then by date)
    activities.sort(function(a, b) {
        var dateA = a.duedate ? new Date(a.duedate) : new Date(0);
        var dateB = b.duedate ? new Date(b.duedate) : new Date(0);
        return dateA - dateB;
    });
    
    var tableHtml = '<div class="table-responsive"><table class="table table-sm table-hover mb-0">' +
        '<thead>' +
        '<tr>' +
        '<th>Type</th>' +
        '<th>Subject</th>' +
        '<th>Assigned To</th>' +
        '<th>Due Date</th>' +
        '<th>Status</th>' +
        '<th>Priority</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
    
    activities.forEach(function(activity) {
        var activityType = escapeHtml(activity.activitytype || 'N/A');
        var subject = escapeHtml(activity.subject || 'N/A');
        var assignedTo = escapeHtml(activity.assignedtoname || 'Unassigned');
        var dueDate = activity.duedate ? formatDate(activity.duedate) : '-';
        var status = activity.status || 'Not Started';
        var priority = activity.priority || 'Normal';
        var activityId = activity.activityid || activity.id;
        
        // Status badge color
        var statusClass = 'badge-secondary';
        if (status === 'Completed') statusClass = 'badge-success';
        else if (status === 'In Progress') statusClass = 'badge-primary';
        else if (status === 'Not Started') statusClass = 'badge-warning';
        
        // Priority badge color
        var priorityClass = 'badge-secondary';
        if (priority === 'High') priorityClass = 'badge-danger';
        else if (priority === 'Medium') priorityClass = 'badge-warning';
        
        // Activity type badge
        var typeClass = 'badge-info';
        if (activityType === 'Call') typeClass = 'badge-primary';
        else if (activityType === 'Meeting') typeClass = 'badge-success';
        else if (activityType === 'Task') typeClass = 'badge-warning';
        
        tableHtml += '<tr>';
        tableHtml += '<td><span class="badge ' + typeClass + '">' + activityType + '</span></td>';
        tableHtml += '<td>';
        if (activityId) {
            tableHtml += '<a href="salesactivitydetail.html?id=' + activityId + '">' + subject + '</a>';
        } else {
            tableHtml += subject;
        }
        tableHtml += '</td>';
        tableHtml += '<td>' + assignedTo + '</td>';
        tableHtml += '<td>' + dueDate + '</td>';
        tableHtml += '<td><span class="badge ' + statusClass + '">' + status + '</span></td>';
        tableHtml += '<td><span class="badge ' + priorityClass + '">' + priority + '</span></td>';
        tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table></div>';
    
    $('#leadActivities').html(tableHtml);
}

function getActivityTimeDisplay(timestamp) {
    if (!timestamp) return '';
    
    try {
        var activityDate = new Date(timestamp);
        // Handle timestamps without timezone info
        if (timestamp && !timestamp.includes('Z') && !timestamp.includes('+') && !timestamp.includes('-') && timestamp.length === 19) {
            activityDate = new Date(timestamp + 'Z');
        }
        
        if (typeof formatDateInUserTimezone === 'function') {
            return formatDateInUserTimezone(activityDate.toISOString(), 'datetime');
        }
        
        // Fallback to simple date formatting
        var now = new Date();
        var diffMs = now - activityDate;
        var diffMins = Math.floor(diffMs / 60000);
        var diffHours = Math.floor(diffMs / 3600000);
        var diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return diffMins + ' minute' + (diffMins > 1 ? 's' : '') + ' ago';
        if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
        if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
        
        return activityDate.toLocaleDateString() + ' ' + activityDate.toLocaleTimeString();
    } catch (e) {
        console.error('Error formatting activity time:', e);
        return timestamp;
    }
}

function getActivityIcon(actionType) {
    // Map action types to icons and colors
    var iconMap = {
        'LEAD_VIEW': { icon: 'ri-eye-line', class: 'text-info' },
        'LEAD_CREATED': { icon: 'ri-add-circle-line', class: 'text-success' },
        'LEAD_UPDATED': { icon: 'ri-edit-line', class: 'text-primary' },
        'LEAD_DELETED': { icon: 'ri-delete-bin-line', class: 'text-danger' },
        'LEAD_CONVERTED': { icon: 'ri-exchange-line', class: 'text-success' },
        'LEAD_STATUS_CHANGED': { icon: 'ri-arrow-right-circle-line', class: 'text-warning' },
        'LEAD_ASSIGNED': { icon: 'ri-user-add-line', class: 'text-info' },
        'LEAD_NOTE_ADDED': { icon: 'ri-sticky-note-add-line', class: 'text-primary' },
        'LEAD_NOTE_UPDATED': { icon: 'ri-sticky-note-line', class: 'text-primary' },
        'LEAD_NOTE_DELETED': { icon: 'ri-sticky-note-2-line', class: 'text-danger' },
        'LEAD_ATTRIBUTE_ADDED': { icon: 'ri-file-add-line', class: 'text-info' },
        'LEAD_ATTRIBUTE_UPDATED': { icon: 'ri-file-edit-line', class: 'text-info' },
        'LEAD_ATTRIBUTE_DELETED': { icon: 'ri-file-line', class: 'text-danger' },
        'LEAD_SCORE_CALCULATED': { icon: 'ri-calculator-line', class: 'text-warning' },
        'LEAD_MERGED': { icon: 'ri-merge-cells-horizontal', class: 'text-info' }
    };
    
    return iconMap[actionType] || { icon: 'ri-history-line', class: 'text-muted' };
}

function loadOpportunities(leadId) {
    if (!leadId) {
        $('#leadOpportunities').html('<p class="text-muted">No opportunities available</p>');
        return;
    }
    
    // Try to fetch opportunities filtered by leadid
    // First, try the specific endpoint if it exists, otherwise filter from all opportunities
    var url = '/api/salesopportunities?orgid=' + orgid + '&leadid=' + leadId;
    
    salesApiCall(url, 'GET', null, function(opportunities) {
        renderOpportunitiesTable(opportunities);
    }, function(error) {
        // If filtering by leadid doesn't work, try fetching all and filtering client-side
        // Or try the account-style endpoint
        salesApiCall('/api/salesleads/' + leadId + '/opportunities?orgid=' + orgid, 'GET', null, function(opportunities) {
            renderOpportunitiesTable(opportunities);
        }, function(error2) {
            // If that also fails, fetch all opportunities and filter by leadid client-side
            salesApiCall('/api/salesopportunities?orgid=' + orgid, 'GET', null, function(allOpportunities) {
                // Filter opportunities by leadid if the field exists
                var filteredOpportunities = [];
                if (allOpportunities && Array.isArray(allOpportunities)) {
                    filteredOpportunities = allOpportunities.filter(function(opp) {
                        return opp.leadid === parseInt(leadId) || opp.lead_id === parseInt(leadId);
                    });
                }
                renderOpportunitiesTable(filteredOpportunities);
            }, function(error3) {
                console.error('Error loading opportunities:', error3);
                $('#leadOpportunities').html('<div class="text-center text-danger py-3"><i class="ri-error-warning-line"></i><br/>Failed to load opportunities. Please try again.</div>');
            });
        });
    });
}

function renderOpportunitiesTable(opportunities) {
    if (!opportunities || opportunities.length === 0) {
        $('#leadOpportunities').html('<div class="text-center text-muted py-3"><i class="ri-briefcase-line"></i><br/>No opportunities found for this lead.</div>');
        return;
    }
    
    var tableHtml = '<div class="table-responsive"><table class="table table-sm table-hover">' +
        '<thead>' +
        '<tr>' +
        '<th>Opportunity Name</th>' +
        '<th>Stage</th>' +
        '<th>Amount</th>' +
        '<th>Probability</th>' +
        '<th>Close Date</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';
    
    opportunities.forEach(function(opp) {
        var oppName = escapeHtml(opp.opportunityname || 'Unnamed');
        var stage = escapeHtml(opp.stage || '-');
        var amount = opp.amount ? '$' + formatCurrency(opp.amount) : '-';
        var probability = opp.probability ? opp.probability + '%' : '-';
        var closeDate = opp.closedate ? formatDate(opp.closedate) : '-';
        var oppId = opp.opportunityid || opp.id;
        
        tableHtml += '<tr>';
        tableHtml += '<td>';
        if (oppId) {
            tableHtml += '<a href="salesopportunitydetail.html?id=' + oppId + '">' + oppName + '</a>';
        } else {
            tableHtml += oppName;
        }
        tableHtml += '</td>';
        tableHtml += '<td><span class="badge badge-outlined badge-primary">' + stage + '</span></td>';
        tableHtml += '<td>' + amount + '</td>';
        tableHtml += '<td>' + probability + '</td>';
        tableHtml += '<td>' + closeDate + '</td>';
        tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table></div>';
    
    $('#leadOpportunities').html(tableHtml);
}

function showAddActivityModalForLead() {
    if (!currentLeadId || !currentLeadData) {
        showSalesError('Lead information not available');
        return;
    }
    
    Swal.fire({
        title: 'Add New Activity',
        html: '<select class="form-select mb-2" id="activityType"><option value="Task">Task</option><option value="Call">Call</option><option value="Meeting">Meeting</option></select>' +
              '<input type="text" class="form-control mb-2" id="activitySubject" placeholder="Subject *" required />' +
              '<textarea class="form-control mb-2" id="activityDescription" placeholder="Description"></textarea>' +
              '<input type="datetime-local" class="form-control mb-2" id="activityDueDate" />' +
              '<select class="form-select mb-2" id="activityPriority"><option value="Normal">Normal</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>' +
              '<select class="form-select" id="activityAssignedTo"><option value="">Select User</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Save',
        didOpen: function() {
            loadSalesUsers('#activityAssignedTo', orgid);
        },
        preConfirm: function() {
            if (!$('#activitySubject').val()) {
                Swal.showValidationMessage('Subject is required');
                return false;
            }
            return {
                orgid: orgid,
                activitytype: $('#activityType').val(),
                subject: $('#activitySubject').val(),
                description: $('#activityDescription').val(),
                relatedtotype: 'Lead',
                relatedtoid: parseInt(currentLeadId),
                duedate: $('#activityDueDate').val() ? new Date($('#activityDueDate').val()).toISOString() : null,
                priority: $('#activityPriority').val(),
                assignedto: $('#activityAssignedTo').val() ? parseInt($('#activityAssignedTo').val()) : null
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            showFooterStatus('Creating activity...', true);
            salesApiCall('/api/salesactivities', 'POST', result.value, function(response) {
                showFooterStatus('Activity created', false);
                showSalesSuccess('Activity created successfully');
                loadActivities(currentLeadId);
                // Trigger next steps regeneration
                triggerNextStepsRegeneration();
            }, function(error) {
                showFooterStatus('Creation failed', false);
                showSalesError('Failed to create activity: ' + (error.responseJSON?.message || 'Unknown error'));
            });
        }
    });
}

function loadNextSteps(lead, notes, attributes) {
    // Prevent concurrent generations
    if (isGeneratingNextSteps) {
        return;
    }
    
    // Check if NextSteps is cached
    var cachedNextSteps = null;
    if (lead.attributes && lead.attributes.NextSteps) {
        cachedNextSteps = lead.attributes.NextSteps;
    }
    
    // If NextSteps attribute doesn't exist, always trigger generation
    if (!cachedNextSteps) {
        // Wait a bit for activities to load, then generate
        setTimeout(function() {
            if (!isGeneratingNextSteps) {
                // Double-check it still doesn't exist (might have been added by another process)
                // Use currentLeadData instead of passed parameters to ensure we have latest data
                if (!currentLeadData || !currentLeadData.attributes || !currentLeadData.attributes.NextSteps) {
                    // Use current lead data to ensure we have the latest
                    if (currentLeadData) {
                        // Re-extract notes and attributes from currentLeadData
                        var currentNotes = [];
                        var currentAttributes = {};
                        if (currentLeadData.attributes) {
                            if (currentLeadData.attributes.LeadNotes) {
                                try {
                                    var notesValue = currentLeadData.attributes.LeadNotes;
                                    if (notesValue && notesValue.trim() !== '' && notesValue !== 'null') {
                                        currentNotes = JSON.parse(notesValue);
                                        if (!Array.isArray(currentNotes)) {
                                            currentNotes = [];
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error parsing LeadNotes:', e);
                                    currentNotes = [];
                                }
                            }
                            for (var key in currentLeadData.attributes) {
                                if (key !== 'LeadNotes' && key !== 'NextSteps') {
                                    currentAttributes[key] = currentLeadData.attributes[key];
                                }
                            }
                        }
                        generateNextSteps(currentLeadData, currentNotes, currentAttributes);
                    } else {
                        generateNextSteps(lead, notes, attributes);
                    }
                } else {
                    displayNextSteps(currentLeadData.attributes.NextSteps);
                }
            }
        }, 2500); // Wait 2.5 seconds for activities to load
        return;
    }
    
    // We have cached value - check if we need to regenerate based on changes
    var needsRegeneration = false;
    
    if (previousLeadState) {
        // Check if status changed
        if (previousLeadState.status !== lead.status) {
            needsRegeneration = true;
        }
        // Check if attributes changed (excluding NextSteps from comparison)
        var currentAttributesHash = JSON.stringify(attributes);
        if (previousLeadState.attributesHash !== currentAttributesHash) {
            needsRegeneration = true;
        }
        // Check if notes changed
        var currentNotesHash = JSON.stringify(notes);
        if (previousLeadState.notesHash !== currentNotesHash) {
            needsRegeneration = true;
        }
        // Don't check activities count here - it's updated separately and shouldn't trigger regeneration
    }
    
    if (needsRegeneration) {
        // Wait a bit for activities to load, then generate
        setTimeout(function() {
            if (!isGeneratingNextSteps) {
                generateNextSteps(lead, notes, attributes);
            }
        }, 1500);
    } else {
        // Use cached value
        displayNextSteps(cachedNextSteps);
    }
}

function generateNextSteps(lead, notes, attributes) {
    // Prevent concurrent generations
    if (isGeneratingNextSteps) {
        return;
    }
    
    isGeneratingNextSteps = true;
    
    // Show loading state
    displayNextSteps('Analyzing lead data with AI...', true);
    
    // Prepare activities data for AI (include details, not just count)
    var activitiesData = [];
    if (currentActivities && currentActivities.length > 0) {
        activitiesData = currentActivities.map(function(activity) {
            return {
                type: activity.activitytype || 'N/A',
                subject: activity.subject || 'N/A',
                dueDate: activity.duedate || null,
                status: activity.status || 'Not Started',
                priority: activity.priority || 'Normal',
                assignedTo: activity.assignedtoname || 'Unassigned'
            };
        });
    }
    
    // Prepare data for AI analysis
    var analysisData = {
        leadName: lead.leadname || '',
        status: lead.status || 'New',
        source: lead.source || '',
        segment: lead.segment || '',
        score: lead.score || 0,
        email: lead.email || '',
        phone: lead.phone || '',
        assignedTo: lead.assignedtoname || 'Unassigned',
        properties: attributes || {},
        notes: notes || [],
        activities: activitiesData, // Send actual activities, not just count
        activitiesCount: activitiesData.length,
        orgid: orgid
    };
    
    // Call AI API endpoint for next steps (similar to AppAudits/analyze pattern)
    salesApiCall('/api/salesleads/' + currentLeadId + '/nextsteps', 'POST', analysisData, function(response) {
        isGeneratingNextSteps = false;
        lastNextStepsRegeneration = Date.now();
        
        var nextSteps = response.nextSteps || response.message || response.answer || 'No specific next steps at this time.';
        
        // Ensure it's a one-liner (take first sentence if multiple)
        if (nextSteps && nextSteps.length > 0) {
            var firstSentence = nextSteps.split('.')[0];
            if (firstSentence.length < nextSteps.length) {
                nextSteps = firstSentence + '.';
            }
            // Limit length to reasonable one-liner
            if (nextSteps.length > 200) {
                nextSteps = nextSteps.substring(0, 197) + '...';
            }
        }
        
        // Save to NextSteps attribute (this updates currentLeadData immediately, no reload)
        saveNextStepsToAttribute(nextSteps);
        
        // Update previous state to include the new NextSteps in the hash
        // This prevents regeneration on next load
        if (previousLeadState) {
            previousLeadState.attributesHash = JSON.stringify(attributes);
        }
        
        // Display the result
        displayNextSteps(nextSteps);
    }, function(error) {
        isGeneratingNextSteps = false;
        console.error('Error generating next steps:', error);
        var errorMsg = 'Unable to generate next steps. Please try again.';
        if (error.responseJSON && error.responseJSON.message) {
            errorMsg = error.responseJSON.message;
        }
        displayNextSteps(errorMsg, false);
    });
}

function saveNextStepsToAttribute(nextSteps) {
    if (!currentLeadId || !currentLeadData) return;
    
    var lead = currentLeadData;
    var attributes = lead.attributes || {};
    attributes.NextSteps = nextSteps;
    
    // Update currentLeadData immediately to prevent loops
    currentLeadData.attributes = attributes;
    
    var leadData = {
        orgid: orgid,
        leadname: lead.leadname,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        segment: lead.segment,
        assignedto: lead.assignedto,
        territoryid: lead.territoryid,
        attributes: attributes
    };
    
    // Save silently in background (don't reload or trigger anything)
    salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function(response) {
        // Successfully saved - no action needed, already updated currentLeadData
    }, function(error) {
        console.error('Error saving next steps:', error);
    });
}

function displayNextSteps(text, isLoading) {
    var nextStepsHtml = '<b>Next Steps:</b> ';
    if (isLoading) {
        nextStepsHtml += '<span class="spinner-border spinner-border-sm" role="status"></span> ' + (text || 'Analyzing...');
    } else {
        nextStepsHtml += (text || 'No specific next steps at this time.');
    }
    $('.alert-outline.alert-primary').html(nextStepsHtml);
}

function triggerNextStepsRegeneration() {
    // Prevent regeneration if already generating
    if (isGeneratingNextSteps) {
        return;
    }
    
    // Debounce: prevent rapid successive calls (wait at least 2 seconds between regenerations)
    var now = Date.now();
    if (now - lastNextStepsRegeneration < 2000) {
        return;
    }
    lastNextStepsRegeneration = now;
    
    // Reload lead details which will trigger next steps regeneration
    if (currentLeadId && currentLeadData) {
        // Clear the cached NextSteps to force regeneration
        if (currentLeadData.attributes && currentLeadData.attributes.NextSteps) {
            delete currentLeadData.attributes.NextSteps;
        }
        
        // Mark that we need regeneration by invalidating previous state
        if (previousLeadState) {
            previousLeadState.attributesHash = ''; // Force change detection
        }
        
        // Reload to trigger regeneration
        setTimeout(function() {
            if (currentLeadId) {
                loadLeadDetails(currentLeadId);
            }
        }, 500);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function initAttributeNameSelect2() {
    // Destroy existing instance if any
    if ($('#attributeName').data('select2')) {
        $('#attributeName').select2('destroy');
    }
    
    $('#attributeName').select2({
        dropdownParent: $('#modalAttribute'),
        tags: true,
        placeholder: 'Select or type new attribute name',
        allowClear: true,
        createTag: function(params) {
            var term = $.trim(params.term);
            if (term === '') return null;
            return { id: term, text: term, newTag: true };
        }
    });
    
    // Load existing attribute names (excluding LeadNotes and NextSteps since they're handled separately)
    salesApiCall('/api/salesleads/attributenames?orgid=' + orgid, 'GET', null, function(names) {
        var options = (names || [])
            .filter(function(name) {
                return name !== 'LeadNotes' && name !== 'NextSteps'; // Hide LeadNotes and NextSteps from attribute dropdown
            })
            .map(function(name) {
                return { id: name, text: name };
            });
        $('#attributeName').empty().select2({
            dropdownParent: $('#modalAttribute'),
            tags: true,
            data: options,
            placeholder: 'Select or type new attribute name',
            allowClear: true,
            createTag: function(params) {
                var term = $.trim(params.term);
                if (term === '') return null;
                // Prevent creating LeadNotes or NextSteps attributes
                if (term === 'LeadNotes' || term === 'NextSteps') {
                    return null;
                }
                return { id: term, text: term, newTag: true };
            }
        });
    });
}

function showAddAttributeModal() {
    $('#editAttributeOriginalName').val('');
    $('#attributeValue').val('');
    $('#attributeModalTitle').text('Add Attribute');
    initAttributeNameSelect2();
    $('#attributeName').val(null).trigger('change').prop('disabled', false);
    $('#modalAttribute').modal('show');
}

function editAttribute(name, value) {
    $('#editAttributeOriginalName').val(name);
    $('#attributeValue').val(value);
    $('#attributeModalTitle').text('Edit Attribute');
    initAttributeNameSelect2();
    
    // Set the value after select2 is initialized
    setTimeout(function() {
        // Add the option if it doesn't exist
        if ($('#attributeName').find("option[value='" + name + "']").length === 0) {
            var newOption = new Option(name, name, true, true);
            $('#attributeName').append(newOption);
        }
        $('#attributeName').val(name).trigger('change').prop('disabled', true);
    }, 300);
    
    $('#modalAttribute').modal('show');
}

function saveAttribute() {
    var name = $('#attributeName').val().trim();
    var value = $('#attributeValue').val().trim();
    
    if (!name || !value) {
        showSalesError('Both name and value are required');
        return;
    }
    
    // Prevent saving LeadNotes or NextSteps as attributes (they're handled separately)
    if (name === 'LeadNotes') {
        showSalesError('LeadNotes is reserved for the Notes section. Please use the "Add Note" button to add notes.');
        return;
    }
    if (name === 'NextSteps') {
        showSalesError('NextSteps is reserved for AI-generated suggestions. It cannot be manually created.');
        return;
    }
    
    // Build attributes object
    var attributes = currentLeadData.attributes || {};
    attributes[name] = value;
    
    // Update lead with new attributes
    var leadData = {
        orgid: orgid,
        leadname: currentLeadData.leadname,
        email: currentLeadData.email,
        phone: currentLeadData.phone,
        source: currentLeadData.source,
        status: currentLeadData.status,
        segment: currentLeadData.segment,
        assignedto: currentLeadData.assignedto,
        territoryid: currentLeadData.territoryid,
        attributes: attributes
    };
    
    showFooterStatus('Saving attribute...', true);
    salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function() {
        showFooterStatus('Attribute saved', false);
        showSalesSuccess('Attribute saved successfully');
        $('#modalAttribute').modal('hide');
        loadLeadDetails(currentLeadId);
        // Trigger next steps regeneration
        triggerNextStepsRegeneration();
    }, function(error) {
        showFooterStatus('Save failed', false);
    });
}

function deleteAttribute(name) {
    if (!name) {
        showSalesError('Attribute name is required');
        return;
    }
    
    confirmSalesAction('Delete attribute "' + name + '"?', function() {
        // Get fresh data to ensure we have all attributes
        var attributes = {};
        if (currentLeadData && currentLeadData.attributes) {
            // Create a copy of all attributes
            for (var key in currentLeadData.attributes) {
                attributes[key] = currentLeadData.attributes[key];
            }
        }
        
        // Delete the attribute
        delete attributes[name];
        
        var leadData = {
            orgid: orgid,
            leadname: currentLeadData.leadname,
            email: currentLeadData.email,
            phone: currentLeadData.phone,
            source: currentLeadData.source,
            status: currentLeadData.status,
            segment: currentLeadData.segment,
            assignedto: currentLeadData.assignedto,
            territoryid: currentLeadData.territoryid,
            attributes: attributes
        };
        
        showFooterStatus('Deleting attribute...', true);
        salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function() {
            showFooterStatus('Attribute deleted', false);
            showSalesSuccess('Attribute deleted');
            loadLeadDetails(currentLeadId);
            // Trigger next steps regeneration
            triggerNextStepsRegeneration();
        }, function(error) {
            showFooterStatus('Delete failed', false);
            showSalesError('Failed to delete attribute: ' + (error.responseJSON?.message || 'Unknown error'));
        });
    });
}

function showAddNoteModal() {
    $('#editNoteIndex').val('');
    $('#noteTitle').val('');
    $('#noteContent').val('');
    $('#noteModalTitle').text('Add Note');
    $('#modalNote').modal('show');
}

function editNote(noteIndex, note) {
    $('#editNoteIndex').val(noteIndex);
    $('#noteTitle').val(note.notetitle || '');
    $('#noteContent').val(note.notecontent || '');
    $('#noteModalTitle').text('Edit Note');
    $('#modalNote').modal('show');
}

function saveNote() {
    var title = $('#noteTitle').val().trim();
    var content = $('#noteContent').val().trim();
    
    if (!content) {
        showSalesError('Note content is required');
        return;
    }
    
    var editIndex = $('#editNoteIndex').val();
    var displayName = displayname || 'Unknown User';
    var currentDate = '';
    try {
        if (typeof formatDateInUserTimezone === 'function') {
            currentDate = formatDateInUserTimezone(new Date().toISOString(), 'datetime');
        } else {
            currentDate = new Date().toISOString();
        }
    } catch (e) {
        currentDate = new Date().toISOString();
    }
    
    // First, get existing notes from the API
    salesApiCall('/api/salesleads/' + currentLeadId + '?orgid=' + orgid, 'GET', null, function(lead) {
        var existingNotes = [];
        
        // Get existing LeadNotes attribute
        if (lead.attributes && lead.attributes.LeadNotes) {
            try {
                var notesValue = lead.attributes.LeadNotes;
                if (notesValue && notesValue.trim() !== '' && notesValue !== 'null') {
                    existingNotes = JSON.parse(notesValue);
                    if (!Array.isArray(existingNotes)) {
                        existingNotes = [];
                    }
                }
            } catch (e) {
                console.error('Error parsing existing notes:', e);
                existingNotes = [];
            }
        }
        
        // Create the new/updated note object
        var noteData = {
            noteaddedby: displayName,
            noteaddeddate: currentDate,
            notecontent: content,
            notetitle: title || null
        };
        
        if (editIndex !== '' && editIndex !== null && existingNotes[parseInt(editIndex)]) {
            // Update existing note
            existingNotes[parseInt(editIndex)] = noteData;
        } else {
            // Add new note to the beginning
            existingNotes.unshift(noteData);
        }
        
        // Build attributes object with updated notes
        var attributes = lead.attributes || {};
        attributes.LeadNotes = JSON.stringify(existingNotes);
        
        // Update lead with new attributes
        var leadData = {
            orgid: orgid,
            leadname: lead.leadname,
            email: lead.email,
            phone: lead.phone,
            source: lead.source,
            status: lead.status,
            segment: lead.segment,
            assignedto: lead.assignedto,
            territoryid: lead.territoryid,
            attributes: attributes
        };
        
        showFooterStatus('Saving note...', true);
        salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function() {
            showFooterStatus('Note saved', false);
            showSalesSuccess('Note saved successfully');
            $('#modalNote').modal('hide');
            loadLeadDetails(currentLeadId);
            // Trigger next steps regeneration
            triggerNextStepsRegeneration();
        }, function(error) {
            showFooterStatus('Save failed', false);
            showSalesError('Failed to save note: ' + (error.responseJSON?.message || 'Unknown error'));
        });
    });
}

function deleteNote(noteIndex) {
    if (noteIndex === null || noteIndex === undefined || noteIndex === '') {
        showSalesError('Note index is required');
        return;
    }
    
    confirmSalesAction('Delete this note?', function() {
        // Get fresh data to ensure we have all attributes
        salesApiCall('/api/salesleads/' + currentLeadId + '?orgid=' + orgid, 'GET', null, function(lead) {
            var existingNotes = [];
            
            // Get existing LeadNotes attribute
            if (lead.attributes && lead.attributes.LeadNotes) {
                try {
                    var notesValue = lead.attributes.LeadNotes;
                    if (notesValue && notesValue.trim() !== '' && notesValue !== 'null') {
                        existingNotes = JSON.parse(notesValue);
                        if (!Array.isArray(existingNotes)) {
                            existingNotes = [];
                        }
                    }
                } catch (e) {
                    console.error('Error parsing existing notes:', e);
                    existingNotes = [];
                }
            }
            
            // Remove the note at the specified index
            if (existingNotes[parseInt(noteIndex)]) {
                existingNotes.splice(parseInt(noteIndex), 1);
            }
            
            // Build attributes object with updated notes
            var attributes = lead.attributes || {};
            attributes.LeadNotes = JSON.stringify(existingNotes);
            
            // Update lead with new attributes
            var leadData = {
                orgid: orgid,
                leadname: lead.leadname,
                email: lead.email,
                phone: lead.phone,
                source: lead.source,
                status: lead.status,
                segment: lead.segment,
                assignedto: lead.assignedto,
                territoryid: lead.territoryid,
                attributes: attributes
            };
            
            showFooterStatus('Deleting note...', true);
            salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function() {
                showFooterStatus('Note deleted', false);
                showSalesSuccess('Note deleted');
                loadLeadDetails(currentLeadId);
                // Trigger next steps regeneration
                triggerNextStepsRegeneration();
            }, function(error) {
                showFooterStatus('Delete failed', false);
                showSalesError('Failed to delete note: ' + (error.responseJSON?.message || 'Unknown error'));
            });
        });
    });
}

function editLeadDetails() {
    if (!currentLeadId) return;
    
    // Initialize select2 dropdowns
    loadSalesUsers('#editLeadAssignedTo', orgid);
    loadSalesTerritories('#editLeadTerritory', orgid);
    
    $('#editLeadAssignedTo, #editLeadTerritory').select2({
        dropdownParent: $('#modalEditLead')
    });
    
    // Load lead data into form
    salesApiCall('/api/salesleads/' + currentLeadId + '?orgid=' + orgid, 'GET', null, function(lead) {
        $('#editLeadId').val(lead.leadid);
        $('#editLeadName').val(lead.leadname);
        $('#editLeadEmail').val(lead.email);
        $('#editLeadPhone').val(lead.phone);
        $('#editLeadSource').val(lead.source);
        $('#editLeadSegment').val(lead.segment);
        
        // Wait for select2 to be initialized then set values
        setTimeout(function() {
            $('#editLeadAssignedTo').val(lead.assignedto).trigger('change');
            $('#editLeadTerritory').val(lead.territoryid).trigger('change');
        }, 500);
        
        $('#modalEditLead').modal('show');
    });
}

function saveLeadFromDetail() {
    var leadId = $('#editLeadId').val();
    var leadData = {
        orgid: orgid,
        leadname: $('#editLeadName').val(),
        email: $('#editLeadEmail').val(),
        phone: $('#editLeadPhone').val(),
        source: $('#editLeadSource').val(),
        status: currentLeadData.status, // Keep current status, don't allow editing
        segment: $('#editLeadSegment').val(),
        assignedto: $('#editLeadAssignedTo').val() ? parseInt($('#editLeadAssignedTo').val()) : null,
        territoryid: $('#editLeadTerritory').val() ? parseInt($('#editLeadTerritory').val()) : null
    };
    
    showFooterStatus('Updating lead details...', true);
    salesApiCall('/api/salesleads/' + leadId, 'PUT', leadData, function(response) {
        showFooterStatus('Lead details updated', false);
        showSalesSuccess('Lead updated successfully');
        $('#modalEditLead').modal('hide');
        loadLeadDetails(currentLeadId);
    }, function(error) {
        showFooterStatus('Update failed', false);
    });
}

function convertLeadFromDetail() {
    if (!currentLeadId) return;
    
    // Check if lead is already converted
    salesApiCall('/api/salesleads/' + currentLeadId + '?orgid=' + orgid, 'GET', null, function(lead) {
        if (lead.status === 'Converted') {
            showAddOpportunityModalDetail(currentLeadId, lead.leadname);
            return;
        }
        showConvertLeadModalDetail(currentLeadId, lead.leadname);
    });
}

function showConvertLeadModalDetail(leadId, leadName) {
    $('#convertLeadIdDetail').val(leadId);
    $('#convertLeadNameDetail').text(leadName);
    $('#chkCreateAccountDetail').prop('checked', true);
    $('#chkCreateContactDetail').prop('checked', true);
    $('#chkCreateOpportunityDetail').prop('checked', false);
    $('#oppFieldsDetail').hide();
    $('#oppNameDetail').val('');
    $('#oppAmountDetail').val('');
    $('#oppCloseDateDetail').val('');
    
    $('#chkCreateOpportunityDetail').off('change').on('change', function() {
        $('#oppFieldsDetail').toggle($(this).is(':checked'));
    });
    
    $('#modalConvertLeadDetail').modal('show');
}

function executeConvertLeadDetail() {
    var leadId = $('#convertLeadIdDetail').val();
    
    var data = {
        createAccount: $('#chkCreateAccountDetail').is(':checked'),
        createContact: $('#chkCreateContactDetail').is(':checked'),
        createOpportunity: $('#chkCreateOpportunityDetail').is(':checked'),
        opportunityname: $('#oppNameDetail').val(),
        opportunityamount: $('#oppAmountDetail').val() ? parseFloat($('#oppAmountDetail').val()) : null,
        closedate: $('#oppCloseDateDetail').val() ? new Date($('#oppCloseDateDetail').val()).toISOString() : null
    };
    
    showFooterStatus('Converting lead...', true);
    salesApiCall('/api/salesleads/' + leadId + '/convert?orgid=' + orgid, 'POST', data, function(response) {
        $('#modalConvertLeadDetail').modal('hide');
        showFooterStatus('Lead converted successfully', false);
        showSalesSuccess('Lead converted successfully');
        loadLeadDetails(currentLeadId);
    }, function(xhr) {
        var errorMessage = 'Failed to convert lead';
        if (xhr.status === 400 && xhr.responseJSON && xhr.responseJSON.error) {
            errorMessage = xhr.responseJSON.error;
        } else if (xhr.responseJSON && xhr.responseJSON.message) {
            errorMessage = xhr.responseJSON.message;
        }
        showFooterStatus('Conversion failed', false);
        showSalesError(errorMessage);
    });
}

function showAddOpportunityFromDetail() {
    if (!currentLeadId || !currentLeadData) {
        showSalesError('Lead information not available');
        return;
    }
    showAddOpportunityModalDetail(currentLeadId, currentLeadData.leadname || '');
}

function showAddOpportunityModalDetail(leadId, leadName) {
    $('#addOppLeadIdDetail').val(leadId);
    $('#addOppLeadNameDetail').text(leadName);
    $('#newOppNameDetail').val('');
    $('#newOppAmountDetail').val('');
    $('#newOppCloseDateDetail').val('');
    $('#modalAddOpportunityDetail').modal('show');
}

function executeAddOpportunityDetail() {
    var leadId = $('#addOppLeadIdDetail').val();
    var oppName = $('#newOppNameDetail').val();
    
    if (!oppName) {
        showSalesError('Opportunity name is required');
        return;
    }
    
    var data = {
        opportunityname: oppName,
        opportunityamount: $('#newOppAmountDetail').val() ? parseFloat($('#newOppAmountDetail').val()) : null,
        closedate: $('#newOppCloseDateDetail').val() ? new Date($('#newOppCloseDateDetail').val()).toISOString() : null
    };
    
    showFooterStatus('Creating opportunity...', true);
    salesApiCall('/api/salesleads/' + leadId + '/add-opportunity?orgid=' + orgid, 'POST', data, function(response) {
        $('#modalAddOpportunityDetail').modal('hide');
        showFooterStatus('Opportunity created', false);
        showSalesSuccess('Opportunity created successfully');
    }, function(error) {
        showFooterStatus('Creation failed', false);
    });
}

function calculateScore() {
    if (!currentLeadId) return;
    showFooterStatus('Recalculating score...', true);
    salesApiCall('/api/salesleads/' + currentLeadId + '/score?orgid=' + orgid, 'GET', null, function(response) {
        showFooterStatus('Score recalculated: ' + response.score, false);
        showSalesSuccess('Score recalculated: ' + response.score);
        loadLeadDetails(currentLeadId);
    }, function(error) {
        showFooterStatus('Score calculation failed', false);
    });
}

function assignLead() {
    if (!currentLeadId) return;
    Swal.fire({
        title: 'Assign Lead',
        html: '<select class="form-select" id="assignUser"><option value="">Select User</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Assign',
        didOpen: function() {
            loadSalesUsers('#assignUser', orgid);
        },
        preConfirm: function() {
            return $('#assignUser').val();
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            showFooterStatus('Assigning lead...', true);
            salesApiCall('/api/salesleads/' + currentLeadId + '/assign', 'POST', {
                leadid: currentLeadId,
                assignedto: parseInt(result.value),
                assignmenttype: 'Manual'
            }, function(response) {
                showFooterStatus('Lead assigned', false);
                showSalesSuccess('Lead assigned successfully');
                loadLeadDetails(currentLeadId);
            }, function(error) {
                showFooterStatus('Assignment failed', false);
            });
        }
    });
}

function mergeWithOther() {
    if (!currentLeadId) return;
    Swal.fire({
        title: 'Merge Lead',
        html: '<input type="text" class="form-control" id="mergeLeadId" placeholder="Enter Lead ID to merge with" />',
        showCancelButton: true,
        confirmButtonText: 'Merge',
        preConfirm: function() {
            return $('#mergeLeadId').val();
        }
    }).then(function(result) {
        if (result.isConfirmed && result.value) {
            salesApiCall('/api/salesleads/merge', 'POST', {
                leadids: [currentLeadId, parseInt(result.value)]
            }, function(response) {
                showSalesSuccess('Leads merged successfully');
                window.location.href = 'salesleads.html';
            });
        }
    });
}

function deleteLeadFromDetail() {
    if (!currentLeadId) return;
    confirmSalesAction('Are you sure you want to delete this lead?', function() {
        showFooterStatus('Deleting lead...', true);
        salesApiCall('/api/salesleads/' + currentLeadId + '?orgid=' + orgid, 'DELETE', null, function() {
            showFooterStatus('Lead deleted', false);
            showSalesSuccess('Lead deleted successfully');
            setTimeout(function() {
                window.location.href = 'salesleads.html';
            }, 1500);
        }, function(error) {
            showFooterStatus('Delete failed', false);
        });
    });
}

// Footer Status Functions
function updateFooterStatusButtons(status) {
    var footer = $('.lead-detail-footer');
    var btnMoveToNext = $('#btnMoveToNextStatus');
    var btnMarkAsLost = $('#btnMarkAsLost');
    var btnMoveToNextText = $('#btnMoveToNextStatusText');
    
    // Always show footer for status messages
    footer.show();
    
    // Hide buttons initially
    btnMoveToNext.hide();
    btnMarkAsLost.hide();
    
    // Don't show status buttons for Lost or Converted status
    if (status === 'Lost' || status === 'Converted') {
        return;
    }
    
    // Determine next status and button text
    var nextStatus = '';
    var buttonText = '';
    
    switch(status) {
        case 'New':
            nextStatus = 'Contacted';
            buttonText = 'Move to Contacted';
            break;
        case 'Contacted':
            nextStatus = 'Qualified';
            buttonText = 'Move to Qualified';
            break;
        case 'Qualified':
            nextStatus = 'Converted';
            buttonText = 'Move to Converted';
            break;
        default:
            return;
    }
    
    // Show and configure buttons
    btnMoveToNextText.text(buttonText);
    btnMoveToNext.data('next-status', nextStatus).show();
    btnMarkAsLost.show();
}

function moveToNextStatus() {
    if (!currentLeadId || !currentLeadData) return;
    
    var nextStatus = $('#btnMoveToNextStatus').data('next-status');
    if (!nextStatus) return;
    
    confirmSalesAction('Move lead to "' + nextStatus + '"?', function() {
        showFooterStatus('Updating lead status...', true);
        
        var leadData = {
            orgid: orgid,
            leadname: currentLeadData.leadname,
            email: currentLeadData.email,
            phone: currentLeadData.phone,
            source: currentLeadData.source,
            status: nextStatus,
            segment: currentLeadData.segment,
            assignedto: currentLeadData.assignedto,
            territoryid: currentLeadData.territoryid
        };
        
        salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function(response) {
            showFooterStatus('Status updated to ' + nextStatus, false);
            showSalesSuccess('Lead status updated to ' + nextStatus);
            loadLeadDetails(currentLeadId);
            // Status change will trigger next steps regeneration automatically
        }, function(error) {
            showFooterStatus('Status update failed', false);
            showSalesError('Failed to update status: ' + (error.responseJSON?.message || 'Unknown error'));
        });
    });
}

function markLeadAsLost() {
    if (!currentLeadId || !currentLeadData) return;
    
    confirmSalesAction('Mark this lead as Lost?', function() {
        showFooterStatus('Marking lead as Lost...', true);
        
        var leadData = {
            orgid: orgid,
            leadname: currentLeadData.leadname,
            email: currentLeadData.email,
            phone: currentLeadData.phone,
            source: currentLeadData.source,
            status: 'Lost',
            segment: currentLeadData.segment,
            assignedto: currentLeadData.assignedto,
            territoryid: currentLeadData.territoryid
        };
        
        salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function(response) {
            showFooterStatus('Lead marked as Lost', false);
            showSalesSuccess('Lead marked as Lost');
            loadLeadDetails(currentLeadId);
        }, function(error) {
            showFooterStatus('Update failed', false);
            showSalesError('Failed to mark as Lost: ' + (error.responseJSON?.message || 'Unknown error'));
        });
    });
}

function reinstateLead() {
    if (!currentLeadId || !currentLeadData) return;
    
    confirmSalesAction('Re-instate this lead back to "New" status?', function() {
        showFooterStatus('Re-instating lead...', true);
        
        var leadData = {
            orgid: orgid,
            leadname: currentLeadData.leadname,
            email: currentLeadData.email,
            phone: currentLeadData.phone,
            source: currentLeadData.source,
            status: 'New',
            segment: currentLeadData.segment,
            assignedto: currentLeadData.assignedto,
            territoryid: currentLeadData.territoryid
        };
        
        salesApiCall('/api/salesleads/' + currentLeadId, 'PUT', leadData, function(response) {
            showFooterStatus('Lead re-instated to New', false);
            showSalesSuccess('Lead re-instated to New status');
            loadLeadDetails(currentLeadId);
        }, function(error) {
            showFooterStatus('Re-instatement failed', false);
            showSalesError('Failed to re-instate lead: ' + (error.responseJSON?.message || 'Unknown error'));
        });
    });
}

function showFooterStatus(message, isLoading) {
    var statusMsg = $('#footerStatusMessage');
    var statusSpinner = $('#footerStatusSpinner');
    
    if (message) {
        statusMsg.text(message);
        if (isLoading) {
            statusMsg.addClass('active');
            statusSpinner.show();
        } else {
            statusMsg.removeClass('active');
            statusSpinner.hide();
            // Clear message after 3 seconds
            setTimeout(function() {
                statusMsg.text('');
            }, 3000);
        }
    } else {
        statusMsg.text('');
        statusMsg.removeClass('active');
        statusSpinner.hide();
    }
}

function setupAjaxStatusMessages() {
    // Replace pace.js with custom status messages
    var activeRequests = 0;
    
    $(document).ajaxStart(function() {
        activeRequests++;
        if (activeRequests === 1) {
            showFooterStatus('Loading...', true);
        }
    });
    
    $(document).ajaxStop(function() {
        activeRequests--;
        if (activeRequests === 0) {
            showFooterStatus('', false);
        }
    });
    
    $(document).ajaxError(function(event, xhr, settings) {
        activeRequests--;
        if (activeRequests === 0) {
            showFooterStatus('Request failed', false);
        }
    });
}

