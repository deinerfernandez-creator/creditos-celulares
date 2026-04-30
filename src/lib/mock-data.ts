export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
};

export type Installment = {
  id: string;
  creditId: string;
  dueDate: string;
  amount: number;
  status: 'pendiente' | 'pagado';
  paidDate?: string;
};

export type Credit = {
  id: string;
  customerId: string;
  deviceModel: string;
  initialAmount: number;
  totalAmount: number;
  planType: 6 | 12;
  installmentAmount: number;
  remainingBalance: number;
  status: 'activo' | 'completado' | 'atrasado';
  createdAt: string;
};

export type Payment = {
  id: string;
  creditId: string;
  installmentId?: string;
  amount: number;
  date: string;
};

export const MOCK_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Juan Pérez', email: 'juan@example.com', phone: '555-0101', address: 'Calle Principal 123', createdAt: '2024-01-15' },
  { id: '2', name: 'María García', email: 'maria@example.com', phone: '555-0202', address: 'Avenida Central 456', createdAt: '2024-02-01' },
];

export const MOCK_CREDITS: Credit[] = [
  {
    id: 'c1',
    customerId: '1',
    deviceModel: 'Samsung Galaxy S23',
    initialAmount: 800,
    totalAmount: 1200, // 50% extra for 6 installments
    planType: 6,
    installmentAmount: 200,
    remainingBalance: 800,
    status: 'activo',
    createdAt: '2024-03-01'
  }
];

export const MOCK_INSTALLMENTS: Installment[] = [
  { id: 'i1', creditId: 'c1', dueDate: '2024-03-15', amount: 200, status: 'pagado', paidDate: '2024-03-14' },
  { id: 'i2', creditId: 'c1', dueDate: '2024-03-30', amount: 200, status: 'pagado', paidDate: '2024-03-29' },
  { id: 'i3', creditId: 'c1', dueDate: '2024-04-15', amount: 200, status: 'pendiente' },
  { id: 'i4', creditId: 'c1', dueDate: '2024-04-30', amount: 200, status: 'pendiente' },
  { id: 'i5', creditId: 'c1', dueDate: '2024-05-15', amount: 200, status: 'pendiente' },
  { id: 'i6', creditId: 'c1', dueDate: '2024-05-30', amount: 200, status: 'pendiente' },
];

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', creditId: 'c1', installmentId: 'i1', amount: 200, date: '2024-03-14' },
  { id: 'p2', creditId: 'c1', installmentId: 'i2', amount: 200, date: '2024-03-29' },
];