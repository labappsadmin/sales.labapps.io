# Sales Module - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Controllers](#api-controllers)
5. [Frontend Pages](#frontend-pages)
6. [JavaScript Files](#javascript-files)
7. [Integration Points](#integration-points)
8. [Setup Instructions](#setup-instructions)
9. [Usage Examples](#usage-examples)
10. [API Reference](#api-reference)
11. [Development Guidelines](#development-guidelines)
12. [Future Enhancements](#future-enhancements)

---

## Overview

The Sales Module is a comprehensive, enterprise-grade sales management system built for LabApps. It provides end-to-end sales process management from lead capture to contract renewal, with advanced features like lead scoring, pipeline management, quote generation, and analytics.

### Key Features

- **Lead Management**: Capture, score, assign, and convert leads
- **Account & Contact Management**: Hierarchical account structure with contact relationships
- **Opportunity Pipeline**: Kanban and list views with stage management
- **Quote & Order Management**: Quote generation, approval workflows, and order processing
- **Contract Management**: Contract lifecycle and renewal tracking
- **Activity Management**: Tasks, calls, meetings with calendar views
- **Product Catalog**: Product management with price lists and bundles
- **Reports & Analytics**: Dashboard, pipeline reports, and custom report builder
- **Admin Configuration**: Territory management, workflow automation, and field configuration

---

## Architecture

### Technology Stack

- **Backend**: ASP.NET Core API (C#) with Dapper ORM
- **Frontend**: HTML5, JavaScript (jQuery), Bootstrap 5, Select2, SweetAlert2
- **Database**: SQL Server with attribute-based extensibility pattern
- **Authentication**: Token-based authentication with cross-domain support

### Design Patterns

1. **Attribute-Based Extensibility**: All entities use `sales_*_attributes` tables for flexible field storage
2. **Multi-Tenancy**: All queries filtered by `orgid` for organization isolation
3. **Audit Logging**: Changes tracked via `appaudits` table
4. **Permission System**: Role-based access control integrated with existing framework
5. **API Consistency**: Follows existing LabApps API patterns and conventions

### File Structure

```
sales.labapps.io/
├── app/                          # Frontend HTML pages
│   ├── saleshome.html            # Dashboard
│   ├── salesleads.html           # Leads list
│   ├── salesleaddetail.html      # Lead detail
│   ├── salesaccounts.html        # Accounts list
│   ├── salesaccountdetail.html   # Account detail
│   ├── salescontacts.html        # Contacts list
│   ├── salescontactdetail.html   # Contact detail
│   ├── salesopportunities.html   # Opportunities (Kanban/List)
│   ├── salesopportunitydetail.html # Opportunity detail
│   ├── salesquotes.html          # Quotes list
│   ├── salesquotedetail.html     # Quote builder
│   ├── salesorders.html          # Orders list
│   ├── salesorderdetail.html     # Order detail
│   ├── salescontracts.html       # Contracts list
│   ├── salesactivities.html      # Activities calendar/list
│   ├── salesproducts.html        # Product catalog
│   ├── salespricelists.html      # Price lists
│   ├── salesreports.html         # Reports & analytics
│   └── salesadmin.html           # Admin configuration
│
├── assets/js/                    # JavaScript files
│   ├── salescore.js              # Core utilities
│   ├── salesleads.js             # Leads management
│   ├── salesaccounts.js          # Accounts management
│   ├── salescontacts.js          # Contacts management
│   ├── salesopportunities.js     # Opportunities management
│   ├── salesquotes.js            # Quotes management
│   ├── salesorders.js            # Orders management
│   ├── salescontracts.js         # Contracts management
│   ├── salesactivities.js        # Activities management
│   ├── salesproducts.js          # Products management
│   ├── salespricelists.js        # Price lists management
│   └── salesadmin.js             # Admin configuration
│
LabAppsApi/
├── Controllers/                   # API Controllers
│   ├── SalesLeadsController.cs
│   ├── SalesAccountsController.cs
│   ├── SalesContactsController.cs
│   ├── SalesOpportunitiesController.cs
│   ├── SalesQuotesController.cs
│   ├── SalesOrdersController.cs
│   ├── SalesContractsController.cs
│   ├── SalesActivitiesController.cs
│   ├── SalesProductsController.cs
│   ├── SalesPriceListsController.cs
│   ├── SalesReportsController.cs
│   └── SalesAdminController.cs
│
└── Database/
    └── CreateSalesModuleTables.sql  # Database schema
```

---

## Database Schema

### Core Tables (sales_ prefix)

All tables follow the naming convention `sales_*` and include standard fields:
- `orgid` (BIGINT) - Organization ID for multi-tenancy
- `createdby` (BIGINT) - User who created the record
- `createddate` (DATETIME2) - Creation timestamp
- `modifiedby` (BIGINT) - User who last modified
- `modifieddate` (DATETIME2) - Last modification timestamp
- `*guid` (UNIQUEIDENTIFIER) - Unique identifier

#### Main Tables

1. **sales_leads** - Lead master table
   - Fields: leadid, leadnumber, leadname, email, phone, source, segment, status, score, assignedto, territoryid
   - Indexes: orgid, status, assignedto, source, score, createddate

2. **sales_lead_attributes** - Flexible attribute storage for leads
   - Fields: dataid, leadid, attributename, attributevalue

3. **sales_accounts** - Account master table
   - Fields: accountid, accountnumber, accountname, parentaccountid, industry, annualrevenue, region, address fields, ownerid
   - Supports hierarchical structure via parentaccountid

4. **sales_account_attributes** - Account attributes

5. **sales_contacts** - Contact master table
   - Fields: contactid, contactnumber, accountid, firstname, lastname, email, phone, title, role, isprimary

6. **sales_contact_attributes** - Contact attributes

7. **sales_opportunities** - Opportunity master table
   - Fields: opportunityid, opportunitynumber, opportunityname, accountid, contactid, stage, amount, closedate, probability, ownerid

8. **sales_opportunity_attributes** - Opportunity attributes (competitor info, next steps, etc.)

9. **sales_opportunity_history** - Version history for opportunities
   - Fields: historyid, opportunityid, fieldname, oldvalue, newvalue, changedby, changeddate

10. **sales_quotes** - Quote master table
    - Fields: quoteid, quotenumber, opportunityid, accountid, status, totalamount, discountamount, validuntil, version, parentquoteid

11. **sales_quote_items** - Quote line items
    - Fields: itemid, quoteid, productid, itemname, description, quantity, unitprice, discount, lineamount, sortorder

12. **sales_orders** - Order master table
    - Fields: orderid, ordernumber, quoteid, opportunityid, accountid, status, totalamount, orderdate

13. **sales_order_items** - Order line items

14. **sales_contracts** - Contract master table
    - Fields: contractid, contractnumber, orderid, accountid, startdate, enddate, renewaldate, billingcycle, status, billingreferenceid

15. **sales_activities** - Activity master table
    - Fields: activityid, activitytype, subject, relatedtoid, relatedtotype, assignedto, duedate, completeddate, status, priority, description

16. **sales_products** - Product catalog
    - Fields: productid, sku, productname, description, unitcost, unitprice, status

17. **sales_price_lists** - Price list master
    - Fields: pricelistid, pricelistname, region, effectivedate, expirydate, isactive

18. **sales_price_list_items** - Price list line items
    - Fields: itemid, pricelistid, productid, price, discountlimit

19. **sales_product_bundles** - Product bundles
    - Fields: bundleid, bundlename, bundleprice, status

20. **sales_bundle_items** - Bundle line items
    - Fields: itemid, bundleid, productid, quantity

21. **sales_territories** - Territory management
    - Fields: territoryid, territoryname, region, ownerid, isactive

22. **sales_lead_scores** - Lead scoring rules
    - Fields: ruleid, rulename, fieldname, condition, conditionvalue, score, isactive

23. **sales_workflows** - Workflow automation rules
    - Fields: workflowid, workflowname, triggertype, triggercondition, actiontype, actionconfig, isactive

#### Integration Tables

24. **sales_lead_to_account** - Lead conversion tracking
    - Fields: conversionid, leadid, accountid, contactid, opportunityid, converteddate, convertedby

25. **sales_account_contacts** - Account-contact relationships
    - Fields: relationshipid, accountid, contactid, influencerole, isprimary

26. **sales_opportunity_contacts** - Opportunity-contact relationships
    - Fields: relationshipid, opportunityid, contactid, role

### Views

1. **view_sales_leads** - Comprehensive lead view with attributes and related data
2. **view_sales_opportunities** - Opportunity pipeline view with calculated fields
3. **view_sales_forecast** - Forecast calculations grouped by stage and owner
4. **view_sales_activities** - Activity timeline view with related entity names

### Database Setup

Run the SQL script to create all tables:
```sql
-- Execute: LabAppsApi/Database/CreateSalesModuleTables.sql
```

The script includes:
- Table creation with proper data types
- Primary keys and foreign key constraints
- Indexes on frequently queried fields
- Views for complex queries
- IF NOT EXISTS checks for idempotent execution

---

## API Controllers

All controllers follow the pattern: `Sales[Entity]Controller.cs` and are located in `LabAppsApi/Controllers/`.

### Base URL
```
https://api.labapps.io/api/sales[entity]
```

### Authentication
All endpoints require the `X-API-KEY` header with a valid authentication token.

### Common Response Patterns

**Success Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "statusCode": 400
}
```

### 1. SalesLeadsController

**Base Route:** `/api/salesleads`

**Endpoints:**
- `GET /api/salesleads` - List leads with filters
  - Query params: `orgid`, `leadid`, `leadnumber`, `status`, `source`, `assignedto`, `minscore`
- `GET /api/salesleads/paginated` - Paginated list
  - Query params: `orgid`, `page`, `pageSize`, `status`, `source`, `assignedto`, `minscore`
- `GET /api/salesleads/{id}` - Get lead details
- `POST /api/salesleads` - Create lead
- `PUT /api/salesleads/{id}` - Update lead
- `DELETE /api/salesleads/{id}` - Delete lead
- `POST /api/salesleads/import` - CSV import
  - Body: `{ leads: [{ leadname, email, phone, source, ... }] }`
- `POST /api/salesleads/{id}/convert` - Convert to account/contact/opportunity
  - Body: `{ createAccount, createContact, createOpportunity, opportunityname, opportunityamount, closedate }`
- `POST /api/salesleads/merge` - Merge duplicate leads
  - Body: `{ leadids: [1, 2, 3] }`
- `POST /api/salesleads/{id}/assign` - Assign lead
  - Body: `{ assignedto, territoryid, assignmenttype: "Manual|RoundRobin|Territory" }`
- `GET /api/salesleads/{id}/score` - Calculate lead score
- `POST /api/salesleads/deduplicate` - Find and merge duplicates
  - Query params: `orgid`

**Example Request:**
```javascript
salesApiCall('/api/salesleads?orgid=123&status=New', 'GET', null, function(leads) {
    console.log(leads);
});
```

### 2. SalesAccountsController

**Base Route:** `/api/salesaccounts`

**Endpoints:**
- `GET /api/salesaccounts` - List accounts
- `GET /api/salesaccounts/{id}` - Get account with children
  - Query params: `includeChildren=true`
- `POST /api/salesaccounts` - Create account
- `PUT /api/salesaccounts/{id}` - Update account
- `DELETE /api/salesaccounts/{id}` - Delete account
- `GET /api/salesaccounts/{id}/contacts` - Get account contacts
- `GET /api/salesaccounts/{id}/opportunities` - Get account opportunities
- `GET /api/salesaccounts/{id}/activities` - Get account activities
- `POST /api/salesaccounts/{id}/notes` - Add note/activity

### 3. SalesContactsController

**Base Route:** `/api/salescontacts`

**Endpoints:**
- `GET /api/salescontacts` - List contacts
- `GET /api/salescontacts/{id}` - Get contact details
- `POST /api/salescontacts` - Create contact
- `PUT /api/salescontacts/{id}` - Update contact
- `DELETE /api/salescontacts/{id}` - Delete contact
- `POST /api/salescontacts/import` - CSV/Excel import
- `GET /api/salescontacts/{id}/activities` - Get contact activities
- `POST /api/salescontacts/{id}/link-account` - Link to account

### 4. SalesOpportunitiesController

**Base Route:** `/api/salesopportunities`

**Endpoints:**
- `GET /api/salesopportunities` - List opportunities
- `GET /api/salesopportunities/pipeline` - Pipeline view data
  - Returns: Stage, count, total amount, weighted forecast, avg probability
- `GET /api/salesopportunities/forecast` - Forecast data
  - Query params: `startDate`, `endDate`
- `GET /api/salesopportunities/{id}` - Get opportunity details
- `POST /api/salesopportunities` - Create opportunity
- `PUT /api/salesopportunities/{id}` - Update opportunity
- `DELETE /api/salesopportunities/{id}` - Delete opportunity
- `POST /api/salesopportunities/{id}/stage` - Change stage
  - Body: `{ stage: "Prospecting" }`
- `GET /api/salesopportunities/{id}/history` - Get version history
- `POST /api/salesopportunities/{id}/comments` - Add comment

### 5. SalesQuotesController

**Base Route:** `/api/salesquotes`

**Endpoints:**
- `GET /api/salesquotes` - List quotes
- `GET /api/salesquotes/{id}` - Get quote with items
- `POST /api/salesquotes` - Create quote (from opportunity)
- `PUT /api/salesquotes/{id}` - Update quote
- `DELETE /api/salesquotes/{id}` - Delete quote
- `POST /api/salesquotes/{id}/items` - Add/update line items
  - Body: `[{ itemname, quantity, unitprice, discount, ... }]`
- `POST /api/salesquotes/{id}/approve` - Submit for approval
  - Body: `{ approved: true, comments: "..." }`
- `POST /api/salesquotes/{id}/version` - Create new version
- `POST /api/salesquotes/{id}/convert-order` - Convert to order

### 6. SalesOrdersController

**Base Route:** `/api/salesorders`

**Endpoints:**
- `GET /api/salesorders` - List orders
- `GET /api/salesorders/{id}` - Get order details
- `POST /api/salesorders` - Create order (from quote)
- `PUT /api/salesorders/{id}` - Update order
- `POST /api/salesorders/{id}/convert-contract` - Convert to contract
  - Body: `{ startdate, enddate, renewaldate, billingcycle }`

### 7. SalesContractsController

**Base Route:** `/api/salescontracts`

**Endpoints:**
- `GET /api/salescontracts` - List contracts
- `GET /api/salescontracts/{id}` - Get contract details
- `POST /api/salescontracts` - Create contract
- `PUT /api/salescontracts/{id}` - Update contract
- `GET /api/salescontracts/renewals` - Get upcoming renewals
  - Query params: `orgid`, `daysAhead=90`
- `POST /api/salescontracts/{id}/renew` - Renew contract

### 8. SalesActivitiesController

**Base Route:** `/api/salesactivities`

**Endpoints:**
- `GET /api/salesactivities` - List activities
  - Query params: `orgid`, `activitytype`, `assignedto`, `status`, `relatedtoid`, `relatedtotype`
- `GET /api/salesactivities/calendar` - Calendar view
  - Query params: `orgid`, `view=day|week|month`, `startDate`, `endDate`
- `GET /api/salesactivities/{id}` - Get activity details
- `POST /api/salesactivities` - Create activity
- `PUT /api/salesactivities/{id}` - Update activity
- `DELETE /api/salesactivities/{id}` - Delete activity
- `POST /api/salesactivities/{id}/reminder` - Set reminder

### 9. SalesProductsController

**Base Route:** `/api/salesproducts`

**Endpoints:**
- `GET /api/salesproducts` - List products
- `GET /api/salesproducts/{id}` - Get product details
- `POST /api/salesproducts` - Create product
- `PUT /api/salesproducts/{id}` - Update product
- `DELETE /api/salesproducts/{id}` - Delete product
- `GET /api/salesproducts/bundles` - List bundles
- `POST /api/salesproducts/bundles` - Create bundle

### 10. SalesPriceListsController

**Base Route:** `/api/salespricelists`

**Endpoints:**
- `GET /api/salespricelists` - List price lists
- `GET /api/salespricelists/{id}` - Get price list with items
- `POST /api/salespricelists` - Create price list
- `PUT /api/salespricelists/{id}` - Update price list
- `POST /api/salespricelists/{id}/items` - Add/update items
- `GET /api/salespricelists/pricing` - Get pricing for product/region
  - Query params: `orgid`, `productid`, `region`

### 11. SalesReportsController

**Base Route:** `/api/salesreports`

**Endpoints:**
- `GET /api/salesreports/dashboard` - Standard dashboard data
  - Returns: pipeline, topOpportunities, recentActivities, leadStats
- `GET /api/salesreports/pipeline` - Pipeline report
- `GET /api/salesreports/forecast` - Forecast report
- `GET /api/salesreports/activities` - Activities report
- `POST /api/salesreports/custom` - Custom report builder
  - Body: `{ table, columns, filters, groupBy, orderBy }`

### 12. SalesAdminController

**Base Route:** `/api/salesadmin`

**Endpoints:**
- `GET /api/salesadmin/territories` - List territories
- `POST /api/salesadmin/territories` - Create territory
- `GET /api/salesadmin/lead-scoring-rules` - List scoring rules
- `POST /api/salesadmin/lead-scoring-rules` - Create scoring rule
- `GET /api/salesadmin/workflows` - List workflows
- `POST /api/salesadmin/workflows` - Create workflow
- `GET /api/salesadmin/field-config` - Get field configuration
- `PUT /api/salesadmin/field-config` - Update field configuration
- `GET /api/salesadmin/templates` - List templates
- `POST /api/salesadmin/templates` - Create template

---

## Frontend Pages

All frontend pages are located in `sales.labapps.io/app/` and follow a consistent structure.

### Common Structure

Each page includes:
- Sidebar navigation (loaded dynamically)
- Header with search and user profile
- Breadcrumb navigation
- Main content area
- Script includes (jQuery, Bootstrap, core.js, auth.js, salescore.js, module-specific JS)

### Page List

1. **saleshome.html** - Sales Dashboard
   - Pipeline visualization
   - Forecast summary
   - Recent activities
   - Quick statistics

2. **salesleads.html** - Leads List
   - Filterable table
   - Lead scoring display
   - Bulk actions
   - Import functionality

3. **salesleaddetail.html** - Lead Detail
   - Lead information
   - Conversion options
   - Merge functionality
   - Score recalculation

4. **salesaccounts.html** - Accounts List
   - Account hierarchy support
   - Filtering and search

5. **salesaccountdetail.html** - Account Detail
   - Account information
   - Related contacts tab
   - Related opportunities tab
   - Activities tab

6. **salescontacts.html** - Contacts List
   - Contact management
   - Account linking

7. **salescontactdetail.html** - Contact Detail
   - Contact information
   - Activity history

8. **salesopportunities.html** - Opportunities Pipeline
   - Kanban view (default)
   - List view toggle
   - Stage-based organization
   - Drag-and-drop stage changes

9. **salesopportunitydetail.html** - Opportunity Detail
   - Opportunity information
   - Stage management
   - History tracking
   - Comments section

10. **salesquotes.html** - Quotes List
    - Quote management
    - Status filtering

11. **salesquotedetail.html** - Quote Builder
    - Line items management
    - Pricing calculations
    - Approval workflow
    - PDF generation

12. **salesorders.html** - Orders List
    - Order management
    - Contract conversion

13. **salesorderdetail.html** - Order Detail
    - Order information
    - Line items
    - Contract conversion

14. **salescontracts.html** - Contracts List
    - Contract management
    - Renewal tracking

15. **salesactivities.html** - Activities Calendar/List
    - Calendar view (daily/weekly/monthly)
    - List view
    - Activity filtering

16. **salesproducts.html** - Product Catalog
    - Product management
    - SKU tracking

17. **salespricelists.html** - Price Lists
    - Price list management
    - Region-based pricing

18. **salesreports.html** - Reports & Analytics
    - Pipeline reports
    - Forecast reports
    - Activities reports
    - Custom report builder

19. **salesadmin.html** - Admin Configuration
    - Territory management
    - Lead scoring rules
    - Workflow automation
    - Field configuration

---

## JavaScript Files

### Core Files

#### salescore.js
Core utility functions for all sales module pages.

**Key Functions:**
- `formatCurrency(amount)` - Format numbers as currency
- `formatDate(dateString)` - Format date strings
- `formatDateTime(dateString)` - Format datetime strings
- `getSalesApiHeaders()` - Get API headers with authentication
- `salesApiCall(url, method, data, successCallback, errorCallback)` - Make API calls with error handling
- `loadSalesUsers(selectElement, orgid)` - Load users for dropdowns
- `loadSalesAccounts(selectElement, orgid)` - Load accounts for dropdowns
- `loadSalesTerritories(selectElement, orgid)` - Load territories for dropdowns
- `showSalesSuccess(message)` - Show success notification
- `showSalesError(message)` - Show error notification
- `confirmSalesAction(message, callback)` - Show confirmation dialog

**API Pattern:**
```javascript
// All API calls use getapiendpoint() and apikey from core.js
salesApiCall('/api/salesleads?orgid=' + orgid, 'GET', null, function(leads) {
    // Handle success
}, function(xhr) {
    // Handle error (optional)
});
```

### Module-Specific Files

Each module has its own JavaScript file with functions for:
- Loading data
- Rendering tables/views
- CRUD operations
- Form handling
- Business logic

**Example Structure:**
```javascript
// salesleads.js
function loadLeads(status) {
    salesApiCall('/api/salesleads/paginated?orgid=' + orgid, 'GET', null, function(response) {
        renderLeadsTable(response.data);
        renderPagination(response.pagination);
    });
}

function renderLeadsTable(leads) {
    // Render table HTML
}

function saveLead() {
    var leadData = { /* ... */ };
    salesApiCall('/api/salesleads', 'POST', leadData, function(response) {
        showSalesSuccess('Lead created successfully');
        loadLeads();
    });
}
```

---

## Integration Points

### 1. Authentication & Authorization

The Sales Module integrates with the existing LabApps authentication system:

- **Authentication**: Uses `auth.js` and `cross-domain-auth.js`
- **API Key**: Uses `apikey` variable from `core.js`
- **User Context**: Uses `userid`, `orgid`, `displayname` from global scope
- **Permissions**: Can be extended with permission checks similar to `CsClientsController`

**Example Permission Check:**
```csharp
// In controller
private async Task<bool> CheckPermissionAsync(long userId, string permission)
{
    // Check user permissions
    // Return true if user has permission
}
```

### 2. Integration with Other Modules

#### com.labapps.io (Accounts)
- Link `sales_accounts` to `orgaccounts` table
- Share account data between modules
- Sync account ownership

#### cs.labapps.io (Customer Service)
- Convert tickets to leads/opportunities
- Link tickets to sales accounts
- View ticket history from account detail

#### portal.labapps.io (Portal)
- Portal users can view assigned opportunities
- Portal users can view quotes/orders
- Limited access based on permissions

### 3. Data Sharing

**Shared Tables:**
- `view_users` - User information
- `orgdepartments` - Department data
- `appaudits` - Audit logging

**Integration Points:**
- User assignment uses `view_users`
- Audit logging uses `appaudits`
- Organization context uses `orgid`

---

## Setup Instructions

### 1. Database Setup

1. **Run the SQL Script:**
   ```sql
   -- Execute: LabAppsApi/Database/CreateSalesModuleTables.sql
   -- This creates all tables, indexes, and views
   ```

2. **Verify Tables:**
   ```sql
   SELECT TABLE_NAME 
   FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_NAME LIKE 'sales_%'
   ORDER BY TABLE_NAME;
   ```

3. **Verify Views:**
   ```sql
   SELECT TABLE_NAME 
   FROM INFORMATION_SCHEMA.VIEWS 
   WHERE TABLE_NAME LIKE 'view_sales_%'
   ORDER BY TABLE_NAME;
   ```

### 2. Backend Setup

1. **Add Controllers:**
   - Controllers are already in `LabAppsApi/Controllers/`
   - Ensure they're registered in the API project

2. **Configure Connection String:**
   - Ensure `DefaultConnection` is set in `appsettings.json`
   - Connection string should point to the LabApps database

3. **Build and Deploy:**
   ```bash
   dotnet build LabAppsApi
   dotnet publish LabAppsApi
   ```

### 3. Frontend Setup

1. **Verify Files:**
   - All HTML files in `sales.labapps.io/app/`
   - All JS files in `sales.labapps.io/assets/js/`

2. **Verify Dependencies:**
   - jQuery (included)
   - Bootstrap 5 (included)
   - Select2 (CDN)
   - SweetAlert2 (CDN)
   - Pace.js (CDN)

3. **Configure API Endpoint:**
   - The `getapiendpoint()` function in `core.js` handles API URL
   - Ensure it points to the correct API server

### 4. Testing

1. **Test API Endpoints:**
   ```bash
   # Example: Get leads
   curl -X GET "https://api.labapps.io/api/salesleads?orgid=1" \
     -H "X-API-KEY: your-api-key"
   ```

2. **Test Frontend:**
   - Navigate to `sales.labapps.io/app/saleshome.html`
   - Verify authentication works
   - Test creating a lead
   - Test viewing opportunities

---

## Usage Examples

### Creating a Lead

**Frontend:**
```javascript
var leadData = {
    orgid: orgid,
    leadname: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    source: 'Website',
    status: 'New'
};

salesApiCall('/api/salesleads', 'POST', leadData, function(response) {
    showSalesSuccess('Lead created successfully');
    loadLeads();
});
```

**API:**
```http
POST /api/salesleads
Content-Type: application/json
X-API-KEY: your-api-key

{
  "orgid": 1,
  "leadname": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "source": "Website",
  "status": "New"
}
```

### Converting a Lead

```javascript
salesApiCall('/api/salesleads/123/convert', 'POST', {
    createAccount: true,
    createContact: true,
    createOpportunity: true,
    opportunityname: 'New Opportunity',
    opportunityamount: 50000,
    closedate: '2024-12-31T00:00:00Z'
}, function(response) {
    showSalesSuccess('Lead converted successfully');
    console.log('Account ID:', response.accountId);
    console.log('Contact ID:', response.contactId);
    console.log('Opportunity ID:', response.opportunityId);
});
```

### Creating a Quote from Opportunity

```javascript
// First, get the opportunity
salesApiCall('/api/salesopportunities/456?orgid=' + orgid, 'GET', null, function(opp) {
    // Create quote
    var quoteData = {
        orgid: orgid,
        opportunityid: opp.opportunityid,
        accountid: opp.accountid,
        validuntil: '2024-12-31T00:00:00Z'
    };
    
    salesApiCall('/api/salesquotes', 'POST', quoteData, function(quote) {
        // Add line items
        var items = [
            {
                itemname: 'Product A',
                quantity: 10,
                unitprice: 1000,
                discount: 10
            }
        ];
        
        salesApiCall('/api/salesquotes/' + quote.quoteid + '/items', 'POST', items, function() {
            showSalesSuccess('Quote created with items');
        });
    });
});
```

### Loading Pipeline Data

```javascript
salesApiCall('/api/salesopportunities/pipeline?orgid=' + orgid, 'GET', null, function(pipeline) {
    pipeline.forEach(function(stage) {
        console.log(stage.stage + ': ' + stage.count + ' opportunities, $' + stage.totalamount);
    });
});
```

---

## API Reference

### Common Request/Response Patterns

#### Pagination

**Request:**
```
GET /api/salesleads/paginated?orgid=1&page=1&pageSize=20
```

**Response:**
```json
{
  "data": [
    {
      "leadid": 1,
      "leadnumber": "L000001",
      "leadname": "John Doe",
      "email": "john@example.com",
      "status": "New",
      "score": 45,
      "attributes": {
        "Company": "Acme Corp",
        "Industry": "Technology"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Error Handling

**401 Unauthorized:**
- Handled globally by `auth.js`
- Shows re-authentication modal
- Retries request after authentication

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "message": "Lead name is required"
}
```

**404 Not Found:**
```json
{
  "error": "Lead not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "An error occurred while processing your request"
}
```

### Data Models

#### SalesLeadDto
```json
{
  "leadid": 1,
  "orgid": 1,
  "leadnumber": "L000001",
  "leadname": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "source": "Website",
  "segment": "Enterprise",
  "status": "New",
  "score": 45,
  "assignedto": 123,
  "territoryid": 5,
  "attributes": {
    "Company": "Acme Corp",
    "Industry": "Technology"
  },
  "assignedtoname": "Jane Smith",
  "territoryname": "West Coast",
  "createddate": "2024-01-15T10:30:00Z"
}
```

#### SalesOpportunityDto
```json
{
  "opportunityid": 1,
  "orgid": 1,
  "opportunitynumber": "OPP000001",
  "opportunityname": "Acme Corp - Enterprise Deal",
  "accountid": 10,
  "contactid": 20,
  "stage": "Proposal",
  "amount": 100000,
  "closedate": "2024-12-31T00:00:00Z",
  "probability": 75,
  "ownerid": 123,
  "weightedamount": 75000,
  "accountname": "Acme Corp",
  "contactname": "John Doe",
  "ownername": "Jane Smith"
}
```

---

## Development Guidelines

### Code Standards

1. **Naming Conventions:**
   - Controllers: `Sales[Entity]Controller`
   - Tables: `sales_[entity]`
   - Attributes: `sales_[entity]_attributes`
   - JavaScript files: `sales[entity].js`
   - HTML files: `sales[entity].html`

2. **API Patterns:**
   - Use `salesApiCall()` for all API requests
   - Always include `orgid` in queries
   - Use pagination for large datasets
   - Return consistent error responses

3. **Database Patterns:**
   - Always filter by `orgid`
   - Use parameterized queries (Dapper)
   - Include audit fields (createdby, createddate, etc.)
   - Use GUIDs for unique identifiers

4. **Frontend Patterns:**
   - Use `salesApiCall()` wrapper function
   - Show loading states with Pace.js
   - Use `notifyuser()` for notifications
   - Handle 401 errors gracefully (handled by auth.js)

### Adding New Features

1. **Database:**
   - Add table with `sales_` prefix
   - Include standard fields (orgid, createdby, etc.)
   - Create attributes table if needed
   - Add indexes for performance

2. **API:**
   - Create controller following existing pattern
   - Implement CRUD operations
   - Add pagination support
   - Include error handling

3. **Frontend:**
   - Create HTML page following template
   - Create JavaScript file with functions
   - Use `salesApiCall()` for API requests
   - Follow existing UI patterns

### Testing Checklist

- [ ] API endpoints return correct data
- [ ] Pagination works correctly
- [ ] Error handling works (401, 404, 500)
- [ ] Frontend displays data correctly
- [ ] Forms validate input
- [ ] CRUD operations work
- [ ] Multi-tenancy (orgid filtering) works
- [ ] Authentication required
- [ ] Audit logging works

---

## Future Enhancements

### Planned Features

1. **Advanced Lead Scoring**
   - Machine learning-based scoring
   - Behavioral scoring
   - Predictive analytics

2. **Email Integration**
   - Email tracking
   - Email templates
   - Automated follow-ups

3. **Document Management**
   - File attachments
   - Document versioning
   - E-signature integration

4. **Mobile App**
   - Native mobile app
   - Offline support
   - Push notifications

5. **Advanced Analytics**
   - Custom dashboards
   - Data visualization
   - Predictive forecasting

6. **Integration Enhancements**
   - CRM integrations (Salesforce, HubSpot)
   - Marketing automation
   - Accounting system integration

### Performance Optimizations

1. **Caching:**
   - Cache frequently accessed data
   - Redis integration
   - Query result caching

2. **Indexing:**
   - Additional indexes for complex queries
   - Full-text search indexes
   - Composite indexes

3. **Query Optimization:**
   - Stored procedures for complex queries
   - Materialized views
   - Query result pagination

---

## Troubleshooting

### Common Issues

1. **API Base URL Not Defined**
   - Ensure `core.js` is loaded before `salescore.js`
   - Check that `getapiendpoint()` function exists
   - Verify API endpoint configuration

2. **Authentication Errors (401)**
   - Check that `apikey` is set in `core.js`
   - Verify token is valid
   - Check token expiration

3. **Data Not Loading**
   - Check browser console for errors
   - Verify `orgid` is set
   - Check API endpoint is accessible
   - Verify database connection

4. **Database Errors**
   - Verify tables exist
   - Check foreign key constraints
   - Verify indexes are created
   - Check connection string

### Debugging Tips

1. **Enable Console Logging:**
   ```javascript
   console.log('API Call:', url, data);
   ```

2. **Check Network Tab:**
   - Verify API requests are sent
   - Check response status codes
   - Review response data

3. **Database Queries:**
   ```sql
   -- Check if data exists
   SELECT * FROM sales_leads WHERE orgid = 1;
   
   -- Check indexes
   EXEC sp_helpindex 'sales_leads';
   ```

---

## Support & Resources

### Documentation
- Requirements: `kb/Sales_Module_Detailed_Requirements.txt`
- Database Schema: `LabAppsApi/Database/CreateSalesModuleTables.sql`
- This README: `Readme/README.md`

### Related Files
- API Controllers: `LabAppsApi/Controllers/Sales*.cs`
- Frontend Pages: `sales.labapps.io/app/sales*.html`
- JavaScript: `sales.labapps.io/assets/js/sales*.js`

### Contact
For questions or issues, refer to the LabApps development team.

---

## Version History

### Version 1.0.0 (Initial Release)
- Complete Sales Module implementation
- All core features implemented
- Database schema created
- API controllers implemented
- Frontend pages created
- JavaScript modules created

---

**Last Updated:** January 2024
**Module Version:** 1.0.0

