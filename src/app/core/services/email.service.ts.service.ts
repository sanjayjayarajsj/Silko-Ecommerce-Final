import { Injectable } from '@angular/core';

const EMAILJS_SERVICE_ID = 'service_5bl4e8e';  
const EMAILJS_TEMPLATE_ID = 'template_1l9psnj';
const EMAILJS_PUBLIC_KEY = '7h2wgg4kQPqH3Dofc';  
@Injectable({
  providedIn: 'root'
})
export class EmailService {
  async sendOtp(params: {
    toEmail: string;
    toName: string;
    otp: string;
    validMinutes: number;
  }): Promise<void> {
    // Loaded only when needed, so it never runs during server-side rendering.
    const emailjs = (await import('@emailjs/browser')).default;

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: params.toEmail,
        to_name: params.toName,
        otp: params.otp,
        valid_minutes: params.validMinutes
      },
      { publicKey: EMAILJS_PUBLIC_KEY }
    );
  }
}