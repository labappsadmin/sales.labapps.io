// Sales Contacts Management JavaScript

function loadContacts(accountId) {
    if (!orgid) return;
    var url = '/api/salescontacts?orgid=' + orgid;
    if (accountId) url += '&accountid=' + accountId;
    
    salesApiCall(url, 'GET', null, function(contacts) {
        renderContactsTable(contacts);
    });
}

function renderContactsTable(contacts) {
    var html = '';
    if (contacts && contacts.length > 0) {
        contacts.forEach(function(contact) {
            html += '<tr>' +
                   '<td><a href="salescontactdetail.html?id=' + contact.contactid + '">' + (contact.contactnumber || 'N/A') + '</a></td>' +
                   '<td>' + (contact.firstname || '') + ' ' + (contact.lastname || '') + '</td>' +
                   '<td>' + (contact.email || 'N/A') + '</td>' +
                   '<td>' + (contact.phone || 'N/A') + '</td>' +
                   '<td>' + (contact.title || 'N/A') + '</td>' +
                   '<td>' + (contact.accountname || 'N/A') + '</td>' +
                   '<td>' + formatDate(contact.createddate) + '</td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="editContact(' + contact.contactid + ')"><i class="ri-edit-line"></i></button> ' +
                   '<button class="btn btn-sm btn-danger" onclick="deleteContact(' + contact.contactid + ')"><i class="ri-delete-bin-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="8" class="text-center text-muted">No contacts found</td></tr>';
    }
    $('#contactsTableBody').html(html);
}

function showAddContactModal() {
    var urlParams = new URLSearchParams(window.location.search);
    var accountId = urlParams.get('accountid');
    
    Swal.fire({
        title: 'Add New Contact',
        html: '<input type="text" class="form-control mb-2" id="contactFirstName" placeholder="First Name *" required />' +
              '<input type="text" class="form-control mb-2" id="contactLastName" placeholder="Last Name *" required />' +
              '<input type="email" class="form-control mb-2" id="contactEmail" placeholder="Email" />' +
              '<input type="text" class="form-control mb-2" id="contactPhone" placeholder="Phone" />' +
              '<input type="text" class="form-control mb-2" id="contactTitle" placeholder="Title" />' +
              '<select class="form-select" id="contactAccount"><option value="">Select Account</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Save',
        didOpen: function() {
            loadSalesAccounts('#contactAccount', orgid);
            if (accountId) $('#contactAccount').val(accountId).trigger('change');
        },
        preConfirm: function() {
            return {
                orgid: orgid,
                firstname: $('#contactFirstName').val(),
                lastname: $('#contactLastName').val(),
                email: $('#contactEmail').val(),
                phone: $('#contactPhone').val(),
                title: $('#contactTitle').val(),
                accountid: $('#contactAccount').val() ? parseInt($('#contactAccount').val()) : null
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salescontacts', 'POST', result.value, function(response) {
                showSalesSuccess('Contact created successfully');
                loadContacts(accountId);
            });
        }
    });
}

function editContact(contactId) {
    window.location.href = 'salescontactdetail.html?id=' + contactId;
}

function deleteContact(contactId) {
    confirmSalesAction('Are you sure you want to delete this contact?', function() {
        salesApiCall('/api/salescontacts/' + contactId + '?orgid=' + orgid, 'DELETE', null, function() {
            showSalesSuccess('Contact deleted successfully');
            loadContacts();
        });
    });
}

function showImportContactModal() {
    Swal.fire({
        title: 'Import Contacts',
        html: '<textarea class="form-control" id="importContactsCSV" rows="10" placeholder="Paste CSV data here (firstname,lastname,email,phone,title)"></textarea>',
        showCancelButton: true,
        confirmButtonText: 'Import',
        preConfirm: function() {
            var csv = $('#importContactsCSV').val();
            if (!csv) {
                Swal.showValidationMessage('Please enter CSV data');
                return false;
            }
            return csv;
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            var lines = result.value.split('\n');
            var contacts = [];
            var headers = lines[0].split(',').map(h => h.trim());
            
            for (var i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                var values = lines[i].split(',');
                var contact = {};
                headers.forEach(function(header, index) {
                    contact[header.toLowerCase()] = values[index] ? values[index].trim() : '';
                });
                contacts.push(contact);
            }
            
            salesApiCall('/api/salescontacts/import?orgid=' + orgid, 'POST', { contacts: contacts }, function(response) {
                showSalesSuccess('Imported ' + response.imported + ' contacts');
                loadContacts();
            });
        }
    });
}

