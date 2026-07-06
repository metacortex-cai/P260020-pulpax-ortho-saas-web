# Form Pattern Standard

## Tech Stack
- **Library**: `react-hook-form`
- **Validation**: `@hookform/resolvers/zod` + `zod`

## Implementation Steps
1. Define a Zod schema for the form.
2. Infer types from the schema.
3. Use `useForm` hook with the resolver.
4. Connect inputs to the `register` method or use `Controller` for UI components.

## Example
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  firstName: z.string().min(1, 'Ad zorunludur'),
  email: z.string().email('Geçersiz e-posta'),
});

type FormData = z.infer<typeof schema>;

export function PatientForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('firstName')} />
      {errors.firstName && <span>{errors.firstName.message}</span>}
      {/* ... */}
    </form>
  );
}
```
