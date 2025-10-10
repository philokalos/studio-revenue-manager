import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { calculateQuote } from '../api/quote';
import PriceBreakdown from '../components/PriceBreakdown';
import QuoteSummary from '../components/QuoteSummary';
import type { QuoteFormData, QuoteInput, QuoteResponse } from '../types/quote';

export default function QuoteCalculator() {
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<QuoteFormData>({
    defaultValues: {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endDate: format(new Date(), 'yyyy-MM-dd'),
      endTime: '13:00',
      initialHeadcount: 3,
      headcountChanges: [],
      discountPercentage: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'headcountChanges',
  });

  const calculateMutation = useMutation({
    mutationFn: calculateQuote,
    onSuccess: (data) => {
      setQuoteResult(data);
    },
    onError: (error) => {
      console.error('Failed to calculate quote:', error);
      alert(`Failed to calculate quote: ${error.message}`);
    },
  });

  // Watch form values for real-time calculation
  const watchedValues = watch();

  // Debounced auto-calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      const formData = watchedValues;

      // Validate dates and headcount
      if (
        !formData.startDate ||
        !formData.startTime ||
        !formData.endDate ||
        !formData.endTime ||
        formData.initialHeadcount < 1
      ) {
        return;
      }

      const startDateTime = `${formData.startDate}T${formData.startTime}:00`;
      const endDateTime = `${formData.endDate}T${formData.endTime}:00`;

      // Validate end is after start
      if (new Date(endDateTime) <= new Date(startDateTime)) {
        return;
      }

      // Prepare quote input
      const input: QuoteInput = {
        start_time: startDateTime,
        end_time: endDateTime,
        initial_headcount: formData.initialHeadcount,
      };

      // Add headcount changes if any
      if (formData.headcountChanges && formData.headcountChanges.length > 0) {
        input.headcount_changes = formData.headcountChanges
          .filter((change) => change.changeDate && change.changeTime && change.newHeadcount > 0)
          .map((change) => ({
            time: `${change.changeDate}T${change.changeTime}:00`,
            newHeadcount: change.newHeadcount,
          }));
      }

      // Add discount if any
      if (formData.discountPercentage > 0) {
        input.discount_percentage = formData.discountPercentage;
      }

      calculateMutation.mutate(input);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues]);

  const onSubmit = (data: QuoteFormData) => {
    // Manual submission (same logic as auto-calculation)
    const startDateTime = `${data.startDate}T${data.startTime}:00`;
    const endDateTime = `${data.endDate}T${data.endTime}:00`;

    const input: QuoteInput = {
      start_time: startDateTime,
      end_time: endDateTime,
      initial_headcount: data.initialHeadcount,
    };

    if (data.headcountChanges && data.headcountChanges.length > 0) {
      input.headcount_changes = data.headcountChanges
        .filter((change) => change.changeDate && change.changeTime && change.newHeadcount > 0)
        .map((change) => ({
          time: `${change.changeDate}T${change.changeTime}:00`,
          newHeadcount: change.newHeadcount,
        }));
    }

    if (data.discountPercentage > 0) {
      input.discount_percentage = data.discountPercentage;
    }

    calculateMutation.mutate(input);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Studio Rental Quote Calculator</h1>
          <p className="mt-2 text-gray-600">
            Calculate real-time pricing for your studio rental with flexible headcount and discount options.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {/* Rental Period */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Rental Period</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      {...register('startDate', { required: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.startDate && (
                      <p className="mt-1 text-sm text-red-600">Start date is required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      {...register('startTime', { required: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.startTime && (
                      <p className="mt-1 text-sm text-red-600">Start time is required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      {...register('endDate', { required: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-sm text-red-600">End date is required</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      {...register('endTime', { required: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.endTime && (
                      <p className="mt-1 text-sm text-red-600">End time is required</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Initial Headcount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Headcount
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  {...register('initialHeadcount', {
                    required: true,
                    min: 1,
                    max: 10,
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.initialHeadcount && (
                  <p className="mt-1 text-sm text-red-600">
                    Headcount must be between 1 and 10
                  </p>
                )}
              </div>

              {/* Headcount Changes */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h2 className="text-lg font-semibold text-gray-900">Headcount Changes</h2>
                  <button
                    type="button"
                    onClick={() =>
                      append({
                        changeDate: format(new Date(), 'yyyy-MM-dd'),
                        changeTime: '12:00',
                        newHeadcount: 3,
                      })
                    }
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    + Add Change
                  </button>
                </div>

                {fields.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No headcount changes. Click "Add Change" to add a headcount change during the rental period.
                  </p>
                )}

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700">
                        Change #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          {...register(`headcountChanges.${index}.changeDate`, {
                            required: true,
                          })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          {...register(`headcountChanges.${index}.changeTime`, {
                            required: true,
                          })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          New Count
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          {...register(`headcountChanges.${index}.newHeadcount`, {
                            required: true,
                            min: 1,
                            max: 10,
                            valueAsNumber: true,
                          })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...register('discountPercentage', {
                    min: 0,
                    max: 100,
                    valueAsNumber: true,
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.discountPercentage && (
                  <p className="mt-1 text-sm text-red-600">
                    Discount must be between 0 and 100
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={calculateMutation.isPending}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {calculateMutation.isPending ? 'Calculating...' : 'Calculate Quote'}
              </button>
            </form>

            {/* Pricing Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Pricing Information</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Weekday (Mon-Fri): ₩40,000/hour</li>
                <li>• Weekend (Sat-Sun): ₩50,000/hour</li>
                <li>• Night (22:00-08:00): ₩25,000/hour</li>
                <li>• Additional person (4+ people): +₩10,000/person</li>
                <li>• Minimum 2-hour rental required</li>
              </ul>
            </div>
          </div>

          {/* Right side - Results */}
          <div className="space-y-6">
            {calculateMutation.isPending && (
              <div className="bg-white rounded-lg shadow-md p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Calculating quote...</p>
                </div>
              </div>
            )}

            {calculateMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-red-900 font-semibold mb-2">Error</h3>
                <p className="text-red-700 text-sm">
                  {calculateMutation.error?.message || 'Failed to calculate quote'}
                </p>
              </div>
            )}

            {quoteResult && !calculateMutation.isPending && (
              <>
                <PriceBreakdown quote={quoteResult} />
                <QuoteSummary quote={quoteResult} />
              </>
            )}

            {!quoteResult && !calculateMutation.isPending && !calculateMutation.isError && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <p>Enter rental details to see price calculation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
