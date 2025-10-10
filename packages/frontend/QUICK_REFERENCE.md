# Reservation Management - Quick Reference

## File Locations

```
src/
├── types/reservation.ts          (54 lines)  - TypeScript interfaces
├── api/reservations.ts           (126 lines) - API client functions
├── components/
│   ├── ReservationModal.tsx      (272 lines) - Create/Edit modal
│   └── ReservationDetail.tsx     (277 lines) - Detail view modal
└── pages/
    └── Reservations.tsx          (330 lines) - Main page
                                  ────────────
                                  1,059 lines total
```

## Key Technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **TanStack Query** - Data fetching/caching
- **react-hook-form** - Form management
- **date-fns** - Date formatting

## API Functions (src/api/reservations.ts)

```typescript
reservationsApi.getReservations(filters?)
reservationsApi.getReservation(id)
reservationsApi.createReservation(data)
reservationsApi.updateReservation(id, data)
reservationsApi.deleteReservation(id)
reservationsApi.addHeadcountChange(id, data)
```

## Component Props

### ReservationModal
```typescript
{
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateReservationInput) => void
  reservation?: Reservation  // For edit mode
  isLoading?: boolean
}
```

### ReservationDetail
```typescript
{
  open: boolean
  onClose: () => void
  reservation: Reservation | null
  onEdit: (reservation: Reservation) => void
  onDelete: (id: number) => void
  onAddHeadcountChange: (id: number, data: AddHeadcountChangeInput) => void
  isDeleting?: boolean
  isAddingHeadcount?: boolean
}
```

## Data Flow

1. **User Action** → Component Event Handler
2. **Component** → useMutation/useQuery (TanStack Query)
3. **TanStack Query** → API Function (src/api/reservations.ts)
4. **API Function** → Backend Endpoint
5. **Backend** → Response
6. **Response** → Cache Update
7. **Cache Update** → UI Re-render

## Common Patterns

### Creating a Reservation
```typescript
const createMutation = useMutation({
  mutationFn: reservationsApi.createReservation,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
  },
});

createMutation.mutate(formData);
```

### Fetching Reservations
```typescript
const { data: reservations = [], isLoading } = useQuery({
  queryKey: ['reservations', filters],
  queryFn: () => reservationsApi.getReservations(filters),
});
```

## Status Logic

```typescript
const now = new Date();
const start = new Date(reservation.start_time);
const end = new Date(reservation.end_time);

if (end < now) return "Completed";
if (start > now) return "Upcoming";
return "Active";
```

## Price Calculation

```typescript
const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
const price = hours * 50 + hours * headcount * 10;
```

## Validation Rules

- **Customer Name**: Required
- **Email**: Required, valid email format
- **Phone**: Required
- **Start Time**: Required
- **End Time**: Required, must be after start time
- **Headcount**: Required, minimum 1

## Route

```
/reservations  (Protected)
```

## Environment

Backend API: `http://localhost:3000/api`

## Testing Checklist

- [ ] Create new reservation
- [ ] Edit existing reservation
- [ ] Delete reservation (with confirmation)
- [ ] View reservation details
- [ ] Add headcount change
- [ ] Search by customer name
- [ ] Search by email
- [ ] Search by phone
- [ ] Filter by status
- [ ] Sort by columns
- [ ] Price calculation accuracy
- [ ] Form validation
- [ ] Error handling
- [ ] Loading states
