import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlarmClock, Trash2, CheckCircle, Plus } from 'lucide-react';
import userService from '../services/userService';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Alarms = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [alarmForm, setAlarmForm] = useState({ name: '', time: '', description: '' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-alarms'],
    queryFn: () => userService.getUserAlarms(),
    refetchInterval: 60000,
  });

  const alarms = data?.data?.alarms || [];

  const updateAlarmMutation = useMutation({
    mutationFn: ({ alarmId, payload }) => userService.updateAlarm(alarmId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-alarms'] }),
  });

  const deleteAlarmMutation = useMutation({
    mutationFn: (alarmId) => userService.deleteAlarm(alarmId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-alarms'] }),
  });

  const createAlarmMutation = useMutation({
    mutationFn: (payload) => userService.createAlarm(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-alarms'] });
      setIsCreateOpen(false);
      setAlarmForm({ name: '', time: '', description: '' });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading alarms..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-600 dark:text-gray-300">Failed to load alarms.</div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-custom">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Alarms</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your reminders and notifications</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
            Add Alarm
          </Button>
        </div>

        {alarms.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <AlarmClock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-gray-600 dark:text-gray-400">No alarms yet.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {alarms.map((alarm, index) => (
              <motion.div
                key={alarm._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="text-gray-900 dark:text-white font-medium">{alarm.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(alarm.time).toLocaleString()}
                  </div>
                  {alarm.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alarm.description}</div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={alarm.isActive ? 'outline' : 'success'}
                    size="sm"
                    onClick={() => updateAlarmMutation.mutate({ alarmId: alarm._id, payload: { isActive: !alarm.isActive } })}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    {alarm.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteAlarmMutation.mutate(alarm._id)}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
    {/* Create Alarm Modal */}
    {isCreateOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Alarm</h3>
            <button onClick={() => setIsCreateOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alarm Name *</label>
              <input
                type="text"
                value={alarmForm.name}
                onChange={(e) => setAlarmForm({ ...alarmForm, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Take medication"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time *</label>
              <input
                type="datetime-local"
                value={alarmForm.time}
                onChange={(e) => setAlarmForm({ ...alarmForm, time: e.target.value })}
                className="input-field"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={alarmForm.description}
                onChange={(e) => setAlarmForm({ ...alarmForm, description: e.target.value })}
                rows={3}
                className="input-field resize-none"
                placeholder="Optional details"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-6">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              leftIcon={<AlarmClock className="w-4 h-4" />}
              isLoading={createAlarmMutation.isPending}
              onClick={() => {
                if (!alarmForm.name.trim() || !alarmForm.time) return;
                const when = new Date(alarmForm.time);
                if (Number.isNaN(when.getTime()) || when <= new Date()) return;
                createAlarmMutation.mutate({ name: alarmForm.name.trim(), time: when.toISOString(), description: alarmForm.description });
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    )}
    {/* Floating Add Alarm Button */}
    <button
      type="button"
      onClick={() => setIsCreateOpen(true)}
      className="fixed bottom-6 right-6 z-40 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center"
      aria-label="Add Alarm"
    >
      <Plus className="w-6 h-6" />
    </button>
    </>
  );
};

export default Alarms;


