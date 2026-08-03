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

async function sendEmail(env: any, formData: FormData): Promise<boolean> {
  const name: string = (formData.get('name') as string) || '';
  const email: string = (formData.get('email') as string) || '';
  const org: string = (formData.get('org') as string) || '';
  const role: string = (formData.get('role') as string) || '';
  const interest: string = (formData.get('interest') as string) || '';
  const message: string = (formData.get('msg') as string) || '';
  const htmlBody: string =
    '<h2>New Contact Form Submission</h2>' +
    '<p><strong>Name:</strong> ' + escapeHtml(name) + '</p>' +
    '<p><strong>Email:</strong> ' + escapeHtml(email) + '</p>' +
    '<p><strong>Organisation:</strong> ' + escapeHtml(org) + '</p>' +
    '<p><strong>Role:</strong> ' + escapeHtml(role) + '</p>' +
    '<p><strong>Interest:</strong> ' + escapeHtml(interest) + '</p>' +
    '<p><strong>Message:</strong></p>' +
    '<p>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>' +
    '<hr><p style="font-size:12px;color:#999;">Sent from resilience.nexus contact form</p>';
  const textBody: string =
    'New Contact Form Submission\n\n' +
    'Name: ' + name + '\n' +
    'Email: ' + email + '\n' +
    'Organisation: ' + org + '\n' +
    'Role: ' + role + '\n' +
    'Interest: ' + interest + '\n\n' +
    'Message:\n' + message + '\n\n' +
    '---\nSent from resilience.nexus contact form';
  const payload: any = {
    from: env.CONTACT_FROM_EMAIL,
    to: env.CONTACT_TO_EMAIL,
    reply_to: email,
    subject: '[Contact Form] New submission from ' + name,
    html: htmlBody,
    text: textBody,
  };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.log('Resend error:', errText);
    return false;
  }
  return true;
}

async function handleContactRequest(request: Request, env: any): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL || !env.RESEND_API_KEY) {
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
  const message = formData.get('msg');
  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ success: false, error: 'Name, email, and message are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const emailOk: boolean = await sendEmail(env, formData);
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
