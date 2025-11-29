# Accounts Page Enhancements – Development Specification

This document outlines all required improvements to upgrade the Accounts List Page into a CRM‑grade enterprise feature. Each enhancement is grouped by priority and written to be directly actionable by Cursor or a development team.

---

## 1. MUST‑HAVE IMPROVEMENTS (CORE FEATURES)

### 1.1 Add Filters Section
Add a filter bar above the accounts table with:
- Owner (dropdown)
- Account Type (dropdown)
- Industry (dropdown)
- Region (dropdown)
- Status (dropdown)
- Reset Filters button
- Keep existing search bar

### 1.2 Enable Column Sorting
Make all major columns sortable:
- Account Name  
- Industry  
- Region  
- Owner  
- Created Date  
- Annual Revenue  

### 1.3 Add “Account Type” Column
Common values:
- Prospect  
- Customer  
- Partner  
- Vendor  
- Competitor  

### 1.4 Add “Last Activity” Column
Pull from account‑related activities.  
Examples:
- “3 days ago”  
- “No activity”  
- “Upcoming: Dec 5 call”  

### 1.5 Add “Open Opportunities” Column
Show count of open opportunities linked to the account.  
Make value clickable (e.g., “2 Open”).

### 1.6 Add Status Badges Column
Add color-coded status labels such as:
- Active (green)  
- Prospect (gray)  
- Onboarding (blue)  
- At-Risk (red)  
- Inactive (yellow)  

---

## 2. HIGH‑VALUE SALES FEATURES

### 2.1 Add Account Team Assignments
Display or support:
- Account Executive  
- Solutions Engineer  
- CS Manager  
- Support Rep  

### 2.2 Add Account Health Score
Simple numeric or badge indicators:
- Green = Healthy  
- Yellow = Watch  
- Red = At Risk  

### 2.3 Add Row‑Level Quick Actions Menu
Add an actions dropdown on each row:
- View Account  
- Edit  
- Add Contact  
- Add Opportunity  
- Add Activity  
- Assign Owner  
- Archive Account  

### 2.4 Add Pagination + Page Size Selector
Include:
- Pagination (1, 2, 3 …)  
- Page size selector: 10 / 25 / 50 / 100  

---

## 3. UI / UX IMPROVEMENTS

### 3.1 Table Density Optimization
Reduce vertical padding in rows to display more data without scrolling.

### 3.2 Row Highlight on Hover
Add background highlight when hovering over a row.

### 3.3 Sticky Table Header
Header remains visible when scrolling long lists.

### 3.4 Add Account Icons / Initials
Generate icon based on account name initials (“AI” for Acme International).

Optional:  
Fetch logo automatically using domain metadata.

---

## 4. DATA ARCHITECTURE IMPROVEMENTS

### 4.1 Add Account Type Field (DB + API)
If missing, extend schema:
```
accounttype VARCHAR(50)
```

### 4.2 Add Status Field (DB + API)
```
status VARCHAR(50)
```

### 4.3 Add Last Activity Lookup
Backend should fetch the most recent activity timestamp.

### 4.4 Add Opportunities Count Lookup
Add API logic to return number of active opportunities per account.

### 4.5 Add Health Score Field (Optional)
```
healthscore INT NULL
```

### 4.6 Add Account Tier (Optional)
```
tier VARCHAR(10)
```

---

## 5. COMPLETE RECOMMENDED COLUMN SET

The final table should include:
- Account #  
- Account Name  
- Type  
- Industry  
- Region  
- Status (badge)  
- Owner  
- Last Activity  
- Open Opportunities  
- Annual Revenue  
- Created Date  
- Health Score (optional)  

---

## 6. OPTIONAL BUT IMPACTFUL FEATURES

### 6.1 Domain Parsing + Auto‑Logo
Extract website domain & fetch company metadata/logo.

### 6.2 Parent–Child Account Hierarchy
Support hierarchies:
- Health System → Hospital → Department → Lab  

### 6.3 Tagging System
Allow free‑form tags:
- “High Potential”  
- “Renewal Q2”  
- “Key Account”  
- “Multi‑Site”  

---

## 7. CLEANUP / REMOVALS

Remove:
- Empty placeholder columns  
- “N/A” values (replace with “—”)  
- Excess whitespace  

---

## 8. DEVELOPMENT PRIORITY ORDER

1. Filters + Sorting  
2. Account Type + Status Columns  
3. Last Activity + Opportunities Columns  
4. Quick Actions Menu  
5. Pagination  
6. UI polish (sticky header, hover states)  
7. Account team + health score  
8. Domain/logo enrichment  
9. Parent‑child hierarchy  
10. Tagging system  

---

## 9. DELIVERABLES

- Updated Accounts API endpoints  
- Updated Accounts table schema (if needed)  
- Updated Accounts List Page UI  
- QA checklist for all new features  
- Responsive design verification  

---

# END OF DOCUMENT
