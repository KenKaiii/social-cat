# E-commerce Modules Reference

## Available Platforms

- Shopify, WooCommerce
- Marketplaces: Amazon, eBay, Etsy
- Print-on-demand: Printful
- Payments: Square, Stripe

Search: `curl "http://localhost:3123/api/modules/search?q=&limit=5"<platform-name>`

## Shopify

```yaml
- module: ecommerce.shopify.listOrders
  id: get-orders
  inputs:
    status: fulfilled
    limit: 50
```

## Amazon Seller

```yaml
- module: ecommerce.amazon-sp.getOrders
  id: get-amazon-orders
  inputs:
    marketplaceId: "{{marketplaceId}}"
```

## Stripe (Payments)

```yaml
- module: payments.stripe.createPaymentIntent
  id: create-payment
  inputs:
    amount: 2000  # $20.00 in cents
    currency: "usd"
```

## Credentials

E-commerce modules require API keys. Search for specific module.
