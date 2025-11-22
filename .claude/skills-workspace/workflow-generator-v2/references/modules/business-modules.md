# Business Modules Reference

## Available Platforms

- CRM: HubSpot, Salesforce, Pipedrive
- Invoicing: QuickBooks, FreshBooks, Xero
- Contracts: DocuSign, HelloSign
- Marketing: GoHighLevel

Search: `curl "http://localhost:3123/api/modules/search?q=&limit=5"<platform-name>`

## HubSpot (CRM)

```yaml
- module: business.hubspot.createContact
  id: create-contact
  inputs:
    email: "{{email}}"
    firstName: "{{firstName}}"
    lastName: "{{lastName}}"
```

## Salesforce

```yaml
- module: business.salesforce.createLead
  id: create-lead
  inputs:
    lastName: "{{name}}"
    company: "{{company}}"
    email: "{{email}}"
```

## QuickBooks (Invoicing)

```yaml
- module: business.quickbooks.createInvoice
  id: create-invoice
  inputs:
    customerId: "{{customerId}}"
    items: "{{invoiceItems}}"
```

## DocuSign (Contracts)

```yaml
- module: business.docusign.sendDocument
  id: send-for-signature
  inputs:
    documentBase64: "{{pdfData}}"
    signerEmail: "{{email}}"
    signerName: "{{name}}"
```

## Credentials

All business modules require API keys or OAuth tokens. Search for specific module.
