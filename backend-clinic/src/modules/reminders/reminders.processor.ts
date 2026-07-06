import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantContext } from '../../common/context/tenant-context';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';

@Processor('reminders')
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'no-show-check') {
      return this.processNoShowCheck(job);
    }
    return this.processReminder(job);
  }

  private async processNoShowCheck(job: Job<any, any, string>): Promise<any> {
    const { clinicId, appointmentId } = job.data;

    this.logger.log(`Processing no-show-check job [${job.id}] for clinic ${clinicId}`);

    return await TenantContext.run({ clinicId }, async () => {
      const client = await this.tenantPrisma.getClient();

      const appointment = await client.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true },
      });

      if (!appointment) {
        this.logger.warn(`Randevu bulunamadı: ${appointmentId}. Gelmedi kontrolü iptal edildi.`);
        return;
      }

      // Randevu hâlâ 'confirmed' mi? (spec §4.4) — değilse (checked_in/completed/cancelled/vb.) bir şey yapma
      if (appointment.status !== 'CONFIRMED') {
        this.logger.log(`Randevu durumu '${appointment.status}'. Gelmedi bildirimi oluşturulmuyor.`);
        return;
      }

      const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

      await client.notification.create({
        data: {
          clinicId,
          type: 'APPOINTMENT_NO_SHOW_CHECK',
          title: 'Randevuya Gelmedi mi?',
          message: `${patientName} randevusuna gelmedi görünüyor.`,
          link: `/appointments?appointmentId=${appointmentId}`,
        },
      });

      this.logger.log(`Gelmedi bildirimi oluşturuldu: Randevu ${appointmentId}`);
    });
  }

  private async processReminder(job: Job<any, any, string>): Promise<any> {
    const { clinicId, appointmentId, patientId } = job.data;

    this.logger.log(`Processing reminder job [${job.id}] for clinic ${clinicId}`);

    // Set tenant context for this worker execution
    return await TenantContext.run({ clinicId }, async () => {
      const client = await this.tenantPrisma.getClient();

      // Randevu ve Hasta bilgilerini çek
      const appointment = await client.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true }
      });

      if (!appointment) {
        this.logger.warn(`Randevu bulunamadı: ${appointmentId}. Hatırlatma iptal edildi.`);
        return;
      }

      // Randevu hala planlı mı?
      if (appointment.status !== 'PLANNED') {
        this.logger.log(`Randevu durumu '${appointment.status}'. Hatırlatma gönderilmiyor.`);
        return;
      }

      const patient = appointment.patient;
      const appointmentDate = new Date(appointment.startOn).toLocaleString('tr-TR');

      // 1. Email Gönder
      if (patient.email) {
        const emailBody = `
          <h2>Randevu Hatırlatması</h2>
          <p>Sayın ${patient.firstName} ${patient.lastName},</p>
          <p><b>${appointmentDate}</b> tarihindeki randevunuzu hatırlatmak isteriz.</p>
          <p>Sağlıklı günler dileriz.</p>
        `;
        await this.emailService.sendEmail(
          patient.email,
          'Randevu Hatırlatması - Pulpax',
          emailBody
        );
      }

      // 2. SMS Gönder
      if (patient.phone) {
        const smsMessage = `Sayin ${patient.firstName} ${patient.lastName}, ${appointmentDate} tarihindeki randevunuzu hatirlatmak isteriz. Saglikli gunler.`;
        await this.smsService.sendSms(patient.phone, smsMessage);
      }

      this.logger.log(`Hatırlatmalar gönderildi: Randevu ${appointmentId} | Hasta ${patientId}`);
    });
  }
}
