import { useState } from 'react';
import { z } from 'zod';
import { Loader2Icon, UserPlusIcon } from 'lucide-react';
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
import { useAdminStore } from '@/store/adminStore';

const addEmployeeSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email('Enter a valid email address')),
});

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function AddEmployeePage() {
  const addEmployee = useAdminStore((s) => s.addEmployee);
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const result = addEmployeeSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] || 'form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setAdding(true);
    const ok = await addEmployee(result.data);
    setAdding(false);
    if (ok) {
      setForm({ name: '', email: '' });
      setErrors({});
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground ">Add Employee</h1>
          <p className="text-sm text-muted-foreground">
            Admin only — registers a new employee on the team.
          </p>
        </div>

        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                                <UserPlusIcon className="size-4" />
              New Employee
              </div>
                 <CardDescription>
              The employee starts with a default annual leave balance.
            </CardDescription>
            </CardTitle>
         
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empName">Name
                   <span className="-ml-1 text-destructive">*</span>
                </Label>
                <Input
                  id="empName"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  aria-invalid={!!errors.name}
                />
                <FieldError message={errors.name} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empEmail">Email
                   <span className="-ml-1 text-destructive">*</span>
                </Label>
                <Input
                  id="empEmail"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                />
                <FieldError message={errors.email} />
              </div>
            </CardContent>
            <div className="px-6 pb-6 pt-3">
              <Button type="submit" className="w-full" disabled={adding}>
                {adding && <Loader2Icon className="animate-spin" />}
                Add Employee
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default AddEmployeePage;
