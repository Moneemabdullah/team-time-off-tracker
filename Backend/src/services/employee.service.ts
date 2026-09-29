import { employeeModel } from '../models/employee.model';
import type { CreateEmployeeInput } from '../schemas/employee.schema';
import { badRequest, conflict, notFound } from '../utils/AppError';

const DEFAULT_LEAVE_BALANCE = 20;

type EmployeeDoc = {
  _id: unknown;
  name: string;
  email: string;
  annualLeaveBalance: number;
  createdAt?: Date;
  updatedAt?: Date;
};

function toResponse(employee: EmployeeDoc): Record<string, unknown> {
  return {
    id: String(employee._id),
    name: employee.name,
    email: employee.email,
    annualLeaveBalance: employee.annualLeaveBalance,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

export async function createEmployee(input: CreateEmployeeInput) {
  const existing = await employeeModel.exists({ email: input.email });
  if (existing) {
    throw conflict('An employee with this email already exists');
  }

  try {
    // The balance is set here, never taken from the request body.
    const employee = await employeeModel.create({
      name: input.name,
      email: input.email,
      annualLeaveBalance: DEFAULT_LEAVE_BALANCE,
    });

    return toResponse(employee.toObject() as unknown as EmployeeDoc);
  } catch (err) {
    // The unique index is the authority; the check above only produces a nicer message.
    if (isDuplicateKeyError(err)) {
      throw conflict('An employee with this email already exists');
    }
    throw err;
  }
}

export async function listEmployees() {
  const employees = await employeeModel.find().sort({ createdAt: -1 });
  return employees.map((employee) =>
    toResponse(employee.toObject() as unknown as EmployeeDoc)
  );
}

export async function getEmployeeById(id: string) {
  if (!isValidObjectId(id)) {
    throw badRequest('Invalid employee id');
  }

  const employee = await employeeModel.findById(id);
  if (!employee) {
    throw notFound('Employee not found');
  }

  return toResponse(employee.toObject() as unknown as EmployeeDoc);
}

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}
