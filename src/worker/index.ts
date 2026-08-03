async function verifyTurnstile(token: string, remoteip: string, secretKey: string): Promise<boolean> {
  const body = new URLSearchParams();
  body.append('secret', secretKey);
  body.append('response', token);
  if (remoteip) body.append('remoteip', remoteip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return false;
  const data: any = await res.json();
  return data.success === true;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendMailChannelsEmail(env: any, formData: FormData): Promise<boolean> {
  const name: string = (formData.get('name') as string) || '';
  const email: string = (formData.get('email') as string) || '';
  const subject: string = (formData.get('subject') as string) || '(No subject)';
  const message: string = (formData.get('message') as string) || '';
  const htmlBody: string =
    '<h2>New Contact Form Submission</h2>' +
    '<p><strong>Name:</strong> ' + escapeHtml(name) + '</p>' +
    '<p><strong>Email:</strong> ' + escapeHtml(email) + '</p>' +
    '<p><strong>Subject:</strong> ' + escapeHtml(subject) + '</p>' +
    '<p><strong>Message:</strong></p>' +
    '<p>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>' +
    '<hr><p style="font-size:12px;color:#999;">Sent from resilience.nexus contact form</p>';
  const textBody: string =
    'New Contact Form Submission\n\n' +
    'Name: ' + name + '\n' +
    'Email: ' + email + '\n' +
    'Subject: ' + subject + '\n\n' +
    'Message:\n' + message + '\n\n' +
    '---\nSent from resilience.nexus contact form';
  const payload: any = {
    personalizations: [{ to: [{ email: env.CONTACT_TO_EMAIL }] }],
    from: { email: env.CONTACT_FROM_EMAIL, name: 'Resilience Nexus Contact' },
    subject: '[Contact Form] ' + subject,
    content: [
      { type: 'text/plain', value: textBody },
      { type: 'text/html', value: htmlBody },
    ],
  };
  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

async function handleContactRequest(request: Request, env: any): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid form data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const turnstileToken: string | null = formData.get('cf-turnstile-response') as string | null;
  if (!turnstileToken) {
    return new Response(
      JSON.stringify({ success: false, error: 'Captcha verification required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const clientIP: string = request.headers.get('CF-Connecting-IP') || '';
  const turnstileOk: boolean = await verifyTurnstile(turnstileToken, clientIP, env.TURNSTILE_SECRET_KEY);
  if (!turnstileOk) {
    return new Response(
      JSON.stringify({ success: false, error: 'Captcha verification failed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
    const name = formData.get('name');
  const email = formData.get('email');
  const message = formData.get('message');
  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ success: false, error: 'Name, email, and message are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const emailOk: boolean = await sendMailChannelsEmail(env, formData);
  if (!emailOk) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to send email' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return new Response(
    JSON.stringify({ success: true, message: 'Your message has been sent. We will get back to you soon.' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      return handleContactRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
