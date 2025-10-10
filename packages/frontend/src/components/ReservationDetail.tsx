import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Reservation, AddHeadcountChangeInput } from '@/types/reservation';

interface ReservationDetailProps {
  open: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  onEdit: (reservation: Reservation) => void;
  onDelete: (id: number) => void;
  onAddHeadcountChange: (id: number, data: AddHeadcountChangeInput) => void;
  isDeleting?: boolean;
  isAddingHeadcount?: boolean;
}

export function ReservationDetail({
  open,
  onClose,
  reservation,
  onEdit,
  onDelete,
  onAddHeadcountChange,
  isDeleting,
  isAddingHeadcount,
}: ReservationDetailProps) {
  const [showHeadcountForm, setShowHeadcountForm] = useState(false);
  const [newHeadcount, setNewHeadcount] = useState('');
  const [changeTime, setChangeTime] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!reservation) return null;

  const isUpcoming = new Date(reservation.start_time) > new Date();
  const isPast = new Date(reservation.end_time) < new Date();
  const isActive = !isUpcoming && !isPast;

  const getStatusBadge = () => {
    if (isPast) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (isActive) {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    return <Badge className="bg-blue-500">Upcoming</Badge>;
  };

  const handleAddHeadcount = () => {
    if (!newHeadcount || !changeTime) return;

    onAddHeadcountChange(reservation.id, {
      new_headcount: parseInt(newHeadcount, 10),
      change_time: changeTime,
    });

    setNewHeadcount('');
    setChangeTime('');
    setShowHeadcountForm(false);
  };

  const handleDelete = () => {
    onDelete(reservation.id);
    setShowDeleteConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Reservation Details</DialogTitle>
            {getStatusBadge()}
          </div>
          <DialogDescription>
            Reservation #{reservation.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <Label className="text-sm text-gray-500">Name</Label>
                <p className="font-medium">{reservation.customer_name}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Email</Label>
                <p className="font-medium">{reservation.customer_email}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Phone</Label>
                <p className="font-medium">{reservation.customer_phone}</p>
              </div>
            </CardContent>
          </Card>

          {/* Reservation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reservation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Start Time</Label>
                  <p className="font-medium">
                    {format(new Date(reservation.start_time), 'PPp')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">End Time</Label>
                  <p className="font-medium">
                    {format(new Date(reservation.end_time), 'PPp')}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Initial Headcount</Label>
                <p className="font-medium">{reservation.initial_headcount} people</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Created</Label>
                <p className="text-sm">
                  {format(new Date(reservation.created_at), 'PPp')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Headcount Changes */}
          {reservation.headcount_changes && reservation.headcount_changes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Headcount Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reservation.headcount_changes.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div>
                        <p className="font-medium">{change.new_headcount} people</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(change.change_time), 'PPp')}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {format(new Date(change.created_at), 'MMM d, h:mm a')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Headcount Change Form */}
          {showHeadcountForm && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Add Headcount Change</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new_headcount">New Headcount</Label>
                  <Input
                    id="new_headcount"
                    type="number"
                    min="1"
                    value={newHeadcount}
                    onChange={(e) => setNewHeadcount(e.target.value)}
                    placeholder="Enter new headcount"
                  />
                </div>
                <div>
                  <Label htmlFor="change_time">Change Time</Label>
                  <Input
                    id="change_time"
                    type="datetime-local"
                    value={changeTime}
                    onChange={(e) => setChangeTime(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddHeadcount}
                    disabled={!newHeadcount || !changeTime || isAddingHeadcount}
                  >
                    {isAddingHeadcount ? 'Adding...' : 'Add Change'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowHeadcountForm(false);
                      setNewHeadcount('');
                      setChangeTime('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-red-900 mb-4">
                  Are you sure you want to delete this reservation? This action cannot
                  be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => onEdit(reservation)}>Edit Reservation</Button>
            {!showHeadcountForm && (
              <Button
                variant="outline"
                onClick={() => setShowHeadcountForm(true)}
              >
                Add Headcount Change
              </Button>
            )}
            {!showDeleteConfirm && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
