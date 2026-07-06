---
name: mobile-engineer
description: Mobile App Engineer skill. Specializes in iOS/Android Native and Cross-Platform (React Native/Flutter) development, offline architectures, push notifications, and App Store guidelines. On Pulpax, focuses on React Native for clinic management mobile features, Pulpax backend API integration, and healthcare mobile UX patterns. Activate for mobile app, iOS, Android, React Native, or Flutter tasks.
---

# Mobile Engineer Skill

## Rol Tanımı
iOS ve Android platformlarında native veya cross-platform uygulama geliştiren uzman roldür.

## Pulpax Proje Bağlamı

**Öncelikli platform:** React Native (mevcut React bilgisini paylaşır)
**Backend API:** `backend-clinic` NestJS API — JWT auth, tenant header
**Hedef kullanıcı:** Doktorlar (hızlı hasta geçmişi) + hastalar (randevu portalı)

**API entegrasyonu:**
```typescript
// Tüm isteklerde tenant ve auth header zorunlu
const apiCall = async (endpoint: string) => {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
    }
  });
};
```

**Healthcare mobile UX:**
- Offline-first: Doktor poliklinik dışında ağ olmayabilir
- Push notification: Randevu hatırlatması, sonuç bildirimi
- Biyometrik auth: Face ID / Touch ID (hasta verisi hassas)
- Minimum adım: Hızlı randevu görüntüleme 1 ekranda

## Sorumluluklar

### 1. React Native Yapısı
```
src/
├── screens/          # Ekranlar (AppointmentScreen, PatientScreen)
├── components/       # Reusable bileşenler
├── hooks/            # Custom hook'lar (useAppointments, useAuth)
├── services/         # API çağrıları
├── navigation/       # React Navigation yapısı
└── types/            # TypeScript tipleri (backend ile senkronize)
```

### 2. Offline Mimari
```typescript
// AsyncStorage ile lokal cache
const getAppointments = async () => {
  try {
    const online = await NetInfo.fetch();
    if (online.isConnected) {
      const data = await apiCall('/appointments');
      await AsyncStorage.setItem('appointments', JSON.stringify(data));
      return data;
    }
    // Offline: cache'den oku
    const cached = await AsyncStorage.getItem('appointments');
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    // Graceful degradation
  }
};
```

### 3. Güvenlik (Healthcare Zorunluluğu)
- Biyometrik auth: `react-native-biometrics`
- Ekran kilidi: Uygulama arka plana geçince hasta verisini gizle
- Jailbreak/root detection: Hassas veri için zorunlu
- Token depolama: AsyncStorage değil, `react-native-keychain`

### 4. Push Notification
```typescript
// Randevu hatırlatması için
const scheduleAppointmentReminder = async (appointment: Appointment) => {
  await notifee.createTriggerNotification(
    { title: 'Randevu Hatırlatması', body: `${appointment.time} randevunuz var` },
    { type: TriggerType.TIMESTAMP, timestamp: reminderTime }
  );
};
```

## Dünya Standartları

- **Offline-First:** Network olmadığında core özellikler çalışmaya devam eder
- **App Store Guidelines:** Apple ve Google politikaları ihlal edilmez
- **Performance:** FlatList, useMemo, useCallback ile React Native optimizasyonu
- **Accessibility:** VoiceOver (iOS) ve TalkBack (Android) desteği

## İş Akışı

1. `ui-ux-designer`'dan mobil design token'larını ve ekran tasarımlarını al
2. `backend-engineer`'dan API endpoint kontratını al
3. React Native screen ve component'leri yaz
4. Offline cache mekanizmasını ekle
5. Biyometrik auth ve güvenlik katmanını uygula
6. **Test:**
```bash
npx react-native run-android
npx react-native run-ios
```

## Kullanım Durumları

- "Randevu listesi mobil ekranını yaz"
- "Push notification ekle"
- "Offline çalışma desteği ekle"
- "Biyometrik authentication uygula"
- "React Native component oluştur"
- "App Store'a hazırlık yap"
