# Communication Modules Reference

## Available Platforms

- Slack, Discord, Telegram
- Email (Gmail, Outlook, generic)
- SMS (Twilio)
- Teams, WhatsApp
- Support (Zendesk, Freshdesk, Intercom)

Search: `curl "http://localhost:3123/api/modules/search?q=&limit=5"<platform-name>`

## Slack

```yaml
- module: communication.slack.sendMessage
  id: notify-slack
  inputs:
    channel: "#general"
    text: "{{message}}"
```

## Discord

```yaml
- module: communication.discord.sendMessage
  id: send-discord
  inputs:
    channelId: "{{channelId}}"
    content: "{{message}}"
```

## Email (Gmail)

```yaml
- module: communication.gmail.sendEmail
  id: send-email
  inputs:
    to: "user@example.com"
    subject: "{{subject}}"
    body: "{{emailBody}}"
```

## Telegram

```yaml
- module: communication.telegram.sendMessage
  id: send-telegram
  inputs:
    chatId: "{{chatId}}"
    text: "{{message}}"
```

## Twilio (SMS)

```yaml
- module: communication.twilio.sendSMS
  id: send-sms
  inputs:
    to: "+1234567890"
    body: "{{message}}"
```

## Credentials

Communication modules require platform credentials. Search for specific module to see requirements.
