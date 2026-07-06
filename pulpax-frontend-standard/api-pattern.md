# API Pattern Standard

## Guidelines
- All API calls must reside in `src/lib/services/`.
- Use the central `axios` instance from `src/lib/api.ts`.
- Every service method must be typed with request/response interfaces.
- Error handling should be consistent, typically leveraging `toastStore` for user feedback.

## Example Service Structure
```typescript
import api from '../api';
import { Patient } from '../../types/patient';

export const PatientService = {
  async getById(id: string): Promise<Patient> {
    const response = await api.get<Patient>(`/patients/${id}`);
    return response.data;
  },
  
  async update(id: string, data: Partial<Patient>): Promise<Patient> {
    const response = await api.put<Patient>(`/patients/${id}`, data);
    return response.data;
  }
};
```
