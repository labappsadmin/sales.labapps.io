// Sales Products Management JavaScript

function loadProducts() {
    if (!orgid) return;
    salesApiCall('/api/salesproducts?orgid=' + orgid, 'GET', null, function(products) {
        renderProductsTable(products);
    });
}

function renderProductsTable(products) {
    var html = '';
    if (products && products.length > 0) {
        products.forEach(function(product) {
            html += '<tr>' +
                   '<td>' + (product.sku || 'N/A') + '</td>' +
                   '<td>' + (product.productname || 'N/A') + '</td>' +
                   '<td>' + (product.description || 'N/A') + '</td>' +
                   '<td>$' + formatCurrency(product.unitcost) + '</td>' +
                   '<td>$' + formatCurrency(product.unitprice) + '</td>' +
                   '<td><span class="badge bg-' + (product.status === 'Active' ? 'success' : 'secondary') + '">' + (product.status || 'N/A') + '</span></td>' +
                   '<td>' +
                   '<button class="btn btn-sm btn-primary" onclick="editProduct(' + product.productid + ')"><i class="ri-edit-line"></i></button> ' +
                   '<button class="btn btn-sm btn-danger" onclick="deleteProduct(' + product.productid + ')"><i class="ri-delete-bin-line"></i></button>' +
                   '</td></tr>';
        });
    } else {
        html = '<tr><td colspan="7" class="text-center text-muted">No products found</td></tr>';
    }
    $('#productsTableBody').html(html);
}

function showAddProductModal() {
    Swal.fire({
        title: 'Add New Product',
        html: '<input type="text" class="form-control mb-2" id="productSKU" placeholder="SKU" />' +
              '<input type="text" class="form-control mb-2" id="productName" placeholder="Product Name *" required />' +
              '<textarea class="form-control mb-2" id="productDescription" placeholder="Description"></textarea>' +
              '<input type="number" class="form-control mb-2" id="productUnitCost" placeholder="Unit Cost" step="0.01" />' +
              '<input type="number" class="form-control mb-2" id="productUnitPrice" placeholder="Unit Price" step="0.01" />' +
              '<select class="form-select" id="productStatus"><option value="Active">Active</option><option value="Inactive">Inactive</option></select>',
        showCancelButton: true,
        confirmButtonText: 'Save',
        preConfirm: function() {
            return {
                orgid: orgid,
                sku: $('#productSKU').val(),
                productname: $('#productName').val(),
                description: $('#productDescription').val(),
                unitcost: $('#productUnitCost').val() ? parseFloat($('#productUnitCost').val()) : null,
                unitprice: $('#productUnitPrice').val() ? parseFloat($('#productUnitPrice').val()) : null,
                status: $('#productStatus').val()
            };
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            salesApiCall('/api/salesproducts', 'POST', result.value, function(response) {
                showSalesSuccess('Product created successfully');
                loadProducts();
            });
        }
    });
}

function editProduct(productId) {
    window.location.href = 'salesproductdetail.html?id=' + productId;
}

function deleteProduct(productId) {
    confirmSalesAction('Are you sure you want to delete this product?', function() {
        salesApiCall('/api/salesproducts/' + productId + '?orgid=' + orgid, 'DELETE', null, function() {
            showSalesSuccess('Product deleted successfully');
            loadProducts();
        });
    });
}

