# Contact Form & Newsletter Setup Guide

## Overview
The AARX Labs website now includes a working contact form and newsletter subscription feature that sends emails to `support@aarx.online`.

---

## Features Added

### 1. Contact Form Section
**Location**: Before footer on homepage  
**URL**: `https://aarx.online/#contact`

**Fields**:
- Name (required)
- Email (required)
- Subject (required)
- Message (required)

**Functionality**:
- Form validation
- Loading state during submission
- Success/error messages
- Auto-reset after successful submission
- Sends email to: `support@aarx.online`

### 2. Newsletter Subscription
**Location**: Between contact form and footer

**Fields**:
- Email (required)

**Functionality**:
- Email validation
- Loading state during submission
- Success/error messages
- Auto-reset after successful submission
- Sends subscription notification to: `support@aarx.online`

---

## Email Service

### Using FormSubmit.co (Free Service)

**Service**: FormSubmit.co  
**Cost**: Free  
**Setup**: No registration required  
**Recipient**: support@aarx.online

#### How It Works:
1. User fills out the form
2. JavaScript sends data to FormSubmit.co API
3. FormSubmit.co forwards the email to `support@aarx.online`
4. You receive the email in your inbox

#### First-Time Setup:
⚠️ **IMPORTANT**: The first time someone submits a form, FormSubmit will send a confirmation email to `support@aarx.online`. You MUST click the confirmation link in that email to activate the service.

**Steps**:
1. Deploy the website
2. Fill out the contact form yourself (test submission)
3. Check `support@aarx.online` inbox
4. Click the confirmation link from FormSubmit
5. After confirmation, all future submissions will work automatically

---

## Email Format

### Contact Form Email
```
From: FormSubmit <noreply@formsubmit.co>
To: support@aarx.online
Subject: [AARX Contact] {User's Subject}

Name: {User's Name}
Email: {User's Email}
Message: {User's Message}
```

### Newsletter Subscription Email
```
From: FormSubmit <noreply@formsubmit.co>
To: support@aarx.online
Subject: [AARX Newsletter] New Subscription

New newsletter subscription from: {User's Email}
```

---

## User Experience

### Contact Form Flow:
1. User clicks "Get Started" or scrolls to contact section
2. Fills out name, email, subject, and message
3. Clicks "Send Message"
4. Button shows "Sending..." (disabled)
5. Success: Green message "Thank you! Your message has been sent..."
6. Error: Red message "Oops! Something went wrong..."
7. Form resets on success
8. Message disappears after 5 seconds

### Newsletter Flow:
1. User enters email in newsletter section
2. Clicks "Subscribe"
3. Button shows "Subscribing..." (disabled)
4. Success: White box with "🎉 Success! You're now subscribed..."
5. Error: White box with "❌ Oops! Something went wrong..."
6. Form resets on success
7. Message disappears after 5 seconds

---

## Alternative Email Services

If you want to use a different email service, here are options:

### Option 1: EmailJS (Recommended for Production)
**Website**: https://www.emailjs.com/  
**Free Tier**: 200 emails/month  
**Setup**: Requires account registration

**Steps**:
1. Create account at EmailJS
2. Add email service (Gmail, Outlook, etc.)
3. Create email template
4. Get Service ID, Template ID, and Public Key
5. Replace FormSubmit code with EmailJS code

### Option 2: Your Own Backend
If you have a backend server, you can:
1. Create an API endpoint (e.g., `/api/contact`)
2. Use SendGrid, Mailgun, or AWS SES
3. Update the fetch URL in the JavaScript

### Option 3: Netlify Forms (If hosting on Netlify)
**Cost**: Free  
**Setup**: Add `netlify` attribute to form tag

---

## Testing

### Test Contact Form:
1. Open `https://aarx.online/#contact`
2. Fill out all fields
3. Click "Send Message"
4. Check `support@aarx.online` for confirmation email (first time only)
5. Click confirmation link
6. Test again - should receive email immediately

### Test Newsletter:
1. Scroll to newsletter section
2. Enter email address
3. Click "Subscribe"
4. Check `support@aarx.online` for subscription notification

---

## Customization

### Change Recipient Email:
Replace `support@aarx.online` in the JavaScript code:

```javascript
// Line ~660 and ~710
const response = await fetch('https://formsubmit.co/ajax/YOUR_EMAIL@example.com', {
```

### Change Success Messages:
```javascript
// Contact form success message (line ~680)
formMessage.textContent = 'Your custom success message here';

// Newsletter success message (line ~730)
newsletterMessage.textContent = 'Your custom success message here';
```

### Change Form Fields:
Edit the HTML form fields in the contact section and update the JavaScript accordingly.

---

## Security Features

✅ **AJAX Submission**: No page reload, better UX  
✅ **Captcha Disabled**: `_captcha: 'false'` for better UX (can enable if spam becomes an issue)  
✅ **Client-side Validation**: Required fields enforced  
✅ **HTTPS**: All submissions over secure connection  
✅ **No API Keys Exposed**: FormSubmit doesn't require API keys in frontend

---

## Troubleshooting

### Emails Not Arriving:
1. Check spam folder in `support@aarx.online`
2. Verify you clicked the confirmation link (first-time setup)
3. Check browser console for errors (F12)
4. Verify email address is correct in code

### Form Not Submitting:
1. Check browser console for errors
2. Verify internet connection
3. Check if FormSubmit.co is online
4. Try different browser

### Success Message Not Showing:
1. Check JavaScript console for errors
2. Verify element IDs match in HTML and JavaScript
3. Clear browser cache

---

## Monitoring

### Check Submission Success:
- Browser console will show fetch response
- FormMessage div will show success/error
- Email inbox will receive notifications

### Track Submissions:
Consider adding Google Analytics events:
```javascript
// After successful submission
gtag('event', 'form_submission', {
  'event_category': 'Contact',
  'event_label': 'Contact Form'
});
```

---

## Future Enhancements

### Possible Improvements:
1. **Email Validation**: Add more robust email validation
2. **Spam Protection**: Add reCAPTCHA if spam becomes an issue
3. **Auto-responder**: Send confirmation email to user
4. **Database Storage**: Store submissions in database
5. **Admin Dashboard**: View all submissions in one place
6. **Newsletter Service**: Integrate with Mailchimp or ConvertKit
7. **File Uploads**: Allow users to attach files
8. **Multi-language**: Support multiple languages

---

## Files Modified

- ✅ `aarx-website/index.html` - Added contact form, newsletter section, and JavaScript handlers

---

## Support

For issues or questions:
- **Email**: support@aarx.online
- **Website**: https://aarx.online

---

*Last Updated: January 15, 2026*
