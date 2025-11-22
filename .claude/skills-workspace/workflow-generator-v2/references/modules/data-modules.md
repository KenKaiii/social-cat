# Data & Storage Modules Reference

## Available Platforms

- Databases: PostgreSQL, MongoDB, MySQL
- Spreadsheets: Google Sheets, Airtable
- Storage: Google Drive, Notion
- Internal: drizzle-utils (workflow storage)

Search: `curl "http://localhost:3123/api/modules/search?q=&limit=5"<platform-name>`

## Google Sheets

```yaml
- module: data.google-sheets.appendRow
  id: add-row
  inputs:
    spreadsheetId: "{{sheetId}}"
    values: ["{{col1}}", "{{col2}}"]
```

## Airtable

```yaml
- module: data.airtable.createRecord
  id: create-record
  inputs:
    baseId: "{{baseId}}"
    tableId: "{{tableId}}"
    fields:
      Name: "{{name}}"
      Email: "{{email}}"
```

## MongoDB

```yaml
- module: data.mongodb.insertOne
  id: insert-doc
  inputs:
    uri: "{{mongoUri}}"
    database: "mydb"
    collectionName: "items"
    document:
      name: "{{name}}"
      value: "{{value}}"
```

## Workflow Storage (drizzle-utils)

**Store data for deduplication:**
```yaml
- module: data.drizzle-utils.insertRecord
  id: store
  inputs:
    workflowId: "{{workflowId}}"
    tableName: my_storage
    data:
      item_id: "{{itemId}}"
    ttl: 2592000  # 30 days
```

**Query stored data:**
```yaml
- module: data.drizzle-utils.queryWhereIn
  id: check-stored
  inputs:
    workflowId: "{{workflowId}}"
    tableName: my_storage
    column: item_id
    values: "{{idArray}}"
```

## Credentials

Data modules require API keys or connection strings. Search for specific module.
