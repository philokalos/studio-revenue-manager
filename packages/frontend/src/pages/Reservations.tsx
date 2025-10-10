import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { reservationsApi } from '@/api/reservations';
import { ReservationModal } from '@/components/ReservationModal';
import { ReservationDetail } from '@/components/ReservationDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Reservation,
  CreateReservationInput,
  ReservationFilters,
  AddHeadcountChangeInput,
} from '@/types/reservation';

export default function Reservations() {
  const queryClient = useQueryClient();

  // State
  const [filters, setFilters] = useState<ReservationFilters>({
    status: 'all',
    sort_by: 'start_time',
    sort_order: 'desc',
    page: 1,
    limit: 50,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | undefined>();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Queries
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations', filters],
    queryFn: () => reservationsApi.getReservations(filters),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: reservationsApi.createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setShowCreateModal(false);
      setEditingReservation(undefined);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateReservationInput }) =>
      reservationsApi.updateReservation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setShowCreateModal(false);
      setEditingReservation(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: reservationsApi.deleteReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setShowDetailModal(false);
      setSelectedReservation(null);
    },
  });

  const addHeadcountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddHeadcountChangeInput }) =>
      reservationsApi.addHeadcountChange(id, data),
    onSuccess: (updatedReservation) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setSelectedReservation(updatedReservation);
    },
  });

  // Handlers
  const handleCreateReservation = (data: CreateReservationInput) => {
    if (editingReservation) {
      updateMutation.mutate({ id: editingReservation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditReservation = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  const handleDeleteReservation = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleAddHeadcountChange = (id: number, data: AddHeadcountChangeInput) => {
    addHeadcountMutation.mutate({ id, data });
  };

  const handleViewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDetailModal(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      status: value as 'upcoming' | 'past' | 'all',
    }));
  };

  const handleSortChange = (column: 'start_time' | 'created_at' | 'customer_name') => {
    setFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order:
        prev.sort_by === column && prev.sort_order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Filter and sort reservations
  const filteredReservations = reservations.filter((reservation) => {
    if (!searchQuery) return true;

    const search = searchQuery.toLowerCase();
    return (
      reservation.customer_name.toLowerCase().includes(search) ||
      reservation.customer_email.toLowerCase().includes(search) ||
      reservation.customer_phone.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (reservation: Reservation) => {
    const now = new Date();
    const start = new Date(reservation.start_time);
    const end = new Date(reservation.end_time);

    if (end < now) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if (start > now) {
      return <Badge className="bg-blue-500">Upcoming</Badge>;
    }
    return <Badge className="bg-green-500">Active</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reservations</h1>
            <p className="text-gray-500 mt-1">
              Manage studio bookings and reservations
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="lg">
            New Reservation
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-md"
          />

          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto text-sm text-gray-500">
            {filteredReservations.length} reservation
            {filteredReservations.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSortChange('customer_name')}
                >
                  Customer
                  {filters.sort_by === 'customer_name' && (
                    <span className="ml-2">
                      {filters.sort_order === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSortChange('start_time')}
                >
                  Start Time
                  {filters.sort_by === 'start_time' && (
                    <span className="ml-2">
                      {filters.sort_order === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Headcount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading reservations...
                  </TableCell>
                </TableRow>
              ) : filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No reservations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((reservation) => (
                  <TableRow
                    key={reservation.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewDetails(reservation)}
                  >
                    <TableCell className="font-medium">
                      {reservation.customer_name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{reservation.customer_email}</div>
                        <div className="text-gray-500">
                          {reservation.customer_phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(reservation.start_time), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(reservation.end_time), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>{reservation.initial_headcount}</TableCell>
                    <TableCell>{getStatusBadge(reservation)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditReservation(reservation);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modals */}
      <ReservationModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingReservation(undefined);
        }}
        onSubmit={handleCreateReservation}
        reservation={editingReservation}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ReservationDetail
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedReservation(null);
        }}
        reservation={selectedReservation}
        onEdit={handleEditReservation}
        onDelete={handleDeleteReservation}
        onAddHeadcountChange={handleAddHeadcountChange}
        isDeleting={deleteMutation.isPending}
        isAddingHeadcount={addHeadcountMutation.isPending}
      />
    </div>
  );
}
