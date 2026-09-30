import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { KeyRoundIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AxiosInstance from '@/lib/axiosInstance';
import { useAuthStore } from '@/store/authStore';

// PATCH /users/users/:id accepts a bare { password } and hashes it server-side.
// The API has no current-password field, so the form only collects and
// confirms the new one.
const changePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function ChangePasswordPage() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const result = changePasswordSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] || 'form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await AxiosInstance.patch(`/users/users/${user.id}`, {
        password: result.data.password,
      });
      toast.success('Password changed successfully');
      setForm({ password: '', confirm: '' });
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl">
        <Card className="border border-border shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <KeyRoundIcon className="size-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Choose a new password — at least 8 characters.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  New password
                  <span className="-ml-1 text-destructive">*</span>
                </Label>
                <Input
                  id="newPassword"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  aria-invalid={!!errors.password}
                />
                <FieldError message={errors.password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm new password
                  <span className="-ml-1 text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repeat the new password"
                  aria-invalid={!!errors.confirm}
                />
                <FieldError message={errors.confirm} />
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-4">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2Icon className="animate-spin" />}
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default ChangePasswordPage;
