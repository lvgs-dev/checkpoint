import { connect } from 'node:tls';
import { once } from 'node:events';
import type { AuthMail, MailSender } from './service.ts';

type Env = Record<string, string | undefined>;

/** Development sender records delivery metadata only. It never logs tokens or links. */
export class ConsoleMailSender implements MailSender {
  async send(message: AuthMail) {
    console.info('auth.mail: development delivery requested', { kind: message.kind });
  }
}

interface SmtpOptions { host: string; port: number; user?: string; password?: string; from: string; origin: string }

/** Implicit TLS SMTP. Certificate validation stays enabled. */
export class SmtpMailSender implements MailSender {
  private options: SmtpOptions;
  constructor(options: SmtpOptions) { this.options = options; }
  async send(message: AuthMail): Promise<void> {
    const options = this.options;
    const address = (value: string) => {
      if (!/^[^\s<>@]+@[^\s<>@]+$/.test(value)) throw new Error('Invalid mail address');
      return value;
    };
    const from = address(options.from);
    const to = address(message.email);
    const socket = connect({ host: options.host, port: options.port, servername: options.host });
    socket.setTimeout(10_000, () => socket.destroy(new Error('SMTP timeout')));
    socket.setEncoding('utf8');
    const lines: string[] = [];
    let buffer = '';
    const reader = socket[Symbol.asyncIterator]();
    const response = async (expected: number) => {
      for (;;) {
        const line = lines.shift();
        if (line === undefined) {
          const next = await reader.next();
          if (next.done) throw new Error('SMTP connection closed');
          buffer += String(next.value);
          let index: number;
          while ((index = buffer.indexOf('\r\n')) >= 0) {
            lines.push(buffer.slice(0, index));
            buffer = buffer.slice(index + 2);
          }
          if (buffer.length > 16_384 || lines.length > 100) throw new Error('SMTP response too large');
          continue;
        }
        if (/^\d{3} /.test(line)) {
          if (Number(line.slice(0, 3)) !== expected) throw new Error('SMTP command rejected');
          return;
        }
      }
    };
    const command = async (value: string, expected: number) => {
      socket.write(value + '\r\n');
      await response(expected);
    };
    try {
      await once(socket, 'secureConnect');
      await response(220);
      await command('EHLO checkpoint', 250);
      if (options.user && options.password) {
        const auth = Buffer.from('\0' + options.user + '\0' + options.password).toString('base64');
        await command('AUTH PLAIN ' + auth, 235);
      }
      await command(`MAIL FROM:<${from}>`, 250);
      await command(`RCPT TO:<${to}>`, 250);
      await command('DATA', 354);
      const link = new URL(message.kind === 'verify_email' ? '/api/v1/auth/verify-email' : '/redefinir-senha', options.origin);
      // Recovery tokens use the fragment so proxies and access logs never receive them.
      if (message.kind === 'reset_password') link.hash = new URLSearchParams({ recovery_token: message.token }).toString();
      else link.searchParams.set('token', message.token);
      await command([
        `From: <${from}>`, `To: <${to}>`,
        `Subject: ${message.kind === 'verify_email' ? 'Verify your email' : 'Reset your password'}`,
        'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', '',
        'This link expires in one hour.', link.href, '.',
      ].join('\r\n'), 250);
      await command('QUIT', 221);
    } finally { socket.destroy(); }
  }
}

export function mailSenderFromEnv(env: Env): MailSender {
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === 'production') throw new Error('SMTP_HOST is required in production');
    return new ConsoleMailSender();
  }
  if (!env.AUTH_ORIGIN || !env.SMTP_FROM) throw new Error('AUTH_ORIGIN and SMTP_FROM are required');
  return new SmtpMailSender({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 465,
    from: env.SMTP_FROM, origin: env.AUTH_ORIGIN, user: env.SMTP_USER, password: env.SMTP_PASSWORD });
}
