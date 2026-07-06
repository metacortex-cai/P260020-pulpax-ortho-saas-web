import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EVENTS, AppointmentCreatedEvent, AppointmentCancelledEvent, AppointmentCompletedEvent, AppointmentConfirmedEvent } from '../../common/events/domain-events';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectQueue('reminders') private readonly remindersQueue: Queue,
  ) {}

  @OnEvent(EVENTS.APPOINTMENT_CREATED)
  async handleAppointmentCreated(event: AppointmentCreatedEvent) {
    const { appointmentId, clinicId, patientId, startOn } = event;
    
    // Hatırlatma zamanı: Randevudan 24 saat önce
    const reminderTime = new Date(startOn);
    reminderTime.setHours(reminderTime.getHours() - 24);

    const now = new Date();
    const delay = reminderTime.getTime() - now.getTime();

    // Eğer randevu 24 saatten daha yakınsa, hemen gönderilebilir veya pas geçilebilir.
    // Burada 1 dakikalık minimum gecikme koyalım (testler için de kolay olur).
    const finalDelay = delay > 0 ? delay : 1000 * 60; 

    this.logger.log(`Randevu [${appointmentId}] için hatırlatma kuyruğa ekleniyor. Gecikme: ${Math.round(finalDelay / 1000 / 60)} dakika.`);

    await this.remindersQueue.add(
      'send-reminder',
      {
        clinicId,
        appointmentId,
        patientId,
      },
      {
        delay: finalDelay,
        jobId: `reminder-${appointmentId}`, // Mükerrerliği önler ve iptal ederken kolaylık sağlar
        removeOnComplete: true,
      },
    );
  }

  @OnEvent(EVENTS.APPOINTMENT_CANCELLED)
  async handleAppointmentCancelled(event: AppointmentCancelledEvent) {
    await this.removeJobIfExists(`reminder-${event.appointmentId}`, 'hatırlatma');
    await this.removeJobIfExists(`no-show-${event.appointmentId}`, 'gelmedi kontrolü');
  }

  @OnEvent(EVENTS.APPOINTMENT_COMPLETED)
  async handleAppointmentCompleted(event: AppointmentCompletedEvent) {
    await this.removeJobIfExists(`reminder-${event.appointmentId}`, 'hatırlatma');
    await this.removeJobIfExists(`no-show-${event.appointmentId}`, 'gelmedi kontrolü');
  }

  /**
   * Randevu 'CONFIRMED' olduğunda, bitişten 15dk sonrası için "hâlâ confirmed mi?"
   * kontrolü zamanlar (spec §4.4 — Gelmedi Otomatik Aksiyonu).
   */
  @OnEvent(EVENTS.APPOINTMENT_CONFIRMED)
  async handleAppointmentConfirmed(event: AppointmentConfirmedEvent) {
    const { appointmentId, clinicId, patientId, doctorId, endOn } = event;

    const checkTime = new Date(endOn);
    checkTime.setMinutes(checkTime.getMinutes() + 15);

    const delay = checkTime.getTime() - Date.now();
    const finalDelay = delay > 0 ? delay : 1000 * 60;

    this.logger.log(`Randevu [${appointmentId}] için gelmedi kontrolü kuyruğa ekleniyor. Gecikme: ${Math.round(finalDelay / 1000 / 60)} dakika.`);

    await this.remindersQueue.add(
      'no-show-check',
      { clinicId, appointmentId, patientId, doctorId },
      {
        delay: finalDelay,
        jobId: `no-show-${appointmentId}`,
        removeOnComplete: true,
      },
    );
  }

  private async removeJobIfExists(jobId: string, label: string) {
    const job = await this.remindersQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`[${jobId}] bekleyen ${label} görevi silindi.`);
    }
  }
}
