import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Reservation, CreateReservationInput } from '@/types/reservation';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReservationInput) => void;
  reservation?: Reservation;
  isLoading?: boolean;
}

export function ReservationModal({
  open,
  onClose,
  onSubmit,
  reservation,
  isLoading,
}: ReservationModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateReservationInput>({
    defaultValues: reservation
      ? {
          customer_name: reservation.customer_name,
          customer_email: reservation.customer_email,
          customer_phone: reservation.customer_phone,
          start_time: new Date(reservation.start_time).toISOString().slice(0, 16),
          end_time: new Date(reservation.end_time).toISOString().slice(0, 16),
          initial_headcount: reservation.initial_headcount,
        }
      : undefined,
  });

  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  // Watch form values for price calculation
  const startTime = watch('start_time');
  const endTime = watch('end_time');
  const headcount = watch('initial_headcount');

  // Calculate estimated price
  useEffect(() => {
    if (startTime && endTime && headcount) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      if (hours > 0) {
        // Simple pricing: $50/hour base + $10/person/hour
        const price = hours * 50 + hours * headcount * 10;
        setEstimatedPrice(price);
      } else {
        setEstimatedPrice(null);
      }
    } else {
      setEstimatedPrice(null);
    }
  }, [startTime, endTime, headcount]);

  // Reset form when modal closes or reservation changes
  useEffect(() => {
    if (open) {
      if (reservation) {
        reset({
          customer_name: reservation.customer_name,
          customer_email: reservation.customer_email,
          customer_phone: reservation.customer_phone,
          start_time: new Date(reservation.start_time).toISOString().slice(0, 16),
          end_time: new Date(reservation.end_time).toISOString().slice(0, 16),
          initial_headcount: reservation.initial_headcount,
        });
      } else {
        reset({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          start_time: '',
          end_time: '',
          initial_headcount: 1,
        });
      }
    }
  }, [open, reservation, reset]);

  const handleFormSubmit = (data: CreateReservationInput) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {reservation ? 'Edit Reservation' : 'New Reservation'}
          </DialogTitle>
          <DialogDescription>
            {reservation
              ? 'Update the reservation details below.'
              : 'Create a new reservation by filling out the form below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Customer Name */}
            <div className="col-span-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                {...register('customer_name', {
                  required: 'Customer name is required',
                })}
                placeholder="John Doe"
              />
              {errors.customer_name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.customer_name.message}
                </p>
              )}
            </div>

            {/* Customer Email */}
            <div>
              <Label htmlFor="customer_email">Email *</Label>
              <Input
                id="customer_email"
                type="email"
                {...register('customer_email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder="john@example.com"
              />
              {errors.customer_email && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.customer_email.message}
                </p>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <Label htmlFor="customer_phone">Phone *</Label>
              <Input
                id="customer_phone"
                type="tel"
                {...register('customer_phone', {
                  required: 'Phone number is required',
                })}
                placeholder="(555) 123-4567"
              />
              {errors.customer_phone && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.customer_phone.message}
                </p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                {...register('start_time', {
                  required: 'Start time is required',
                })}
              />
              {errors.start_time && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.start_time.message}
                </p>
              )}
            </div>

            {/* End Time */}
            <div>
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                {...register('end_time', {
                  required: 'End time is required',
                  validate: (value) => {
                    const start = watch('start_time');
                    if (start && value && new Date(value) <= new Date(start)) {
                      return 'End time must be after start time';
                    }
                    return true;
                  },
                })}
              />
              {errors.end_time && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.end_time.message}
                </p>
              )}
            </div>

            {/* Initial Headcount */}
            <div className="col-span-2">
              <Label htmlFor="initial_headcount">Number of People *</Label>
              <Input
                id="initial_headcount"
                type="number"
                min="1"
                {...register('initial_headcount', {
                  required: 'Headcount is required',
                  min: {
                    value: 1,
                    message: 'Headcount must be at least 1',
                  },
                  valueAsNumber: true,
                })}
              />
              {errors.initial_headcount && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.initial_headcount.message}
                </p>
              )}
            </div>
          </div>

          {/* Price Preview */}
          {estimatedPrice !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  Estimated Price:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  ${estimatedPrice.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                This is an estimate based on duration and headcount
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : reservation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
