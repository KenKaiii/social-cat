/**
 * Communication Modules
 *
 * Send messages via email, chat platforms, and notifications
 * - Email (Resend)
 * - Slack
 * - Discord
 * - Telegram
 * - Twilio (SMS, MMS, Voice, WhatsApp)
 * - WhatsApp Business API
 * - OneSignal (Push Notifications)
 * - Firebase Cloud Messaging
 * - Zendesk (Support Tickets)
 * - Freshdesk (Help Desk)
 * - Intercom (Customer Messaging)
 */

import * as email from './email';
import * as slack from './slack';
import * as discord from './discord';
import * as telegram from './telegram';
import * as twilio from './twilio';
import * as whatsapp from './whatsapp';
import * as onesignal from './onesignal';
import * as firebase from './firebase';
import * as zendesk from './zendesk';
import * as freshdesk from './freshdesk';
import * as intercom from './intercom';
import * as mailchimp from './mailchimp';
import * as microsoftTeams from './microsoft-teams';

export {
  email,
  slack,
  discord,
  telegram,
  twilio,
  whatsapp,
  onesignal,
  firebase,
  zendesk,
  freshdesk,
  intercom,
  mailchimp,
  microsoftTeams
};
