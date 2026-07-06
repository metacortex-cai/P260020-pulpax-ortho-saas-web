# API Versioning

## Global Prefix

Tüm API endpoint'leri şu base URL ile başlar:

```
http://localhost:3000/api/v1
```

## Endpoints

### Authentication
- `POST /api/v1/auth/login` - Giriş
- `POST /api/v1/auth/refresh` - Token yenileme

### Patients
- `GET /api/v1/patients` - Tüm hastaları listele
- `POST /api/v1/patients` - Yeni hasta oluştur
- `GET /api/v1/patients/:id` - Hasta detaylarını getir
- `PATCH /api/v1/patients/:id` - Hasta bilgisini güncelle (gelecek)

### Appointments
- `POST /api/v1/appointments` - Randevu oluştur
- `GET /api/v1/appointments` - Randevuları listele (gelecek)
- `PATCH /api/v1/appointments/:id/status` - Randevu durumu güncelle

### Treatments
- `POST /api/v1/treatments/plans` - Tedavi planı oluştur
- `PATCH /api/v1/treatments/:id/status` - Tedavi durumu güncelle

### Payments
- `POST /api/v1/payments` - Ödeme işle

## Future Versions

Future'da v2, v3 gibi versiyonlar için, controllers'ı `/v2` prefix'iyle yeniden ayarlayabilirsiniz:

```typescript
@Controller('v2/patients')
export class PatientsControllerV2 { }
```

Bu durumda endpoint: `POST /api/v2/patients` olur.

## Headers

Tüm authenticated endpoint'leri için gerekli:

```
Authorization: Bearer <JWT_TOKEN>
X-Tenant-ID: <CLINIC_ID>
```

## Error Responses

Tüm hata responses standart format kullanır:

```json
{
  "statusCode": 400,
  "message": "Hata mesajı",
  "timestamp": "2026-05-11T10:30:00.000Z",
  "path": "/api/v1/endpoint",
  "errors": {}
}
```
