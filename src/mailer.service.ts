//service responsable de l'envoie d'email

import { Resend } from 'resend';

export class MailerService {
  private readonly mailer: Resend; //fonctionnalité disponible uniquement
  constructor() {
    this.mailer = new Resend(process.env.RESEND_API_KEY);
  }
  async sendEmail({ recipient }: { recipient: string }) {
    const { data, error } = await this.mailer.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: [recipient],
      subject: 'Bienvenue sur la chat application',
      html: ` <strong>It works! ${recipient} </strong>`,
    });

    if (error) {
      return console.error({ error });
    }

    console.log({ data });
  }

  async sendRequestedEmailPassword({
    recipient,
    token,
  }: {
    recipient: string;
    token: string;
  }) {
    try {
      const link = `${process.env.FRONTEND_URL}/forgot-password?token=${token}`;
      const data = await this.mailer.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [recipient],
        subject: 'Pour réinitialiser votre mot de passe',
        html: ` <strong>It works! ${recipient} voici votre lien de réinitialisation : ${link} </strong>`,
      });

      console.log({ data });
    } catch (error) {
      console.error(error);
    }
  }
}
