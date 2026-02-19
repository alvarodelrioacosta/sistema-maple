import { supabase } from '../lib/supabase';
import type { Task, TaskProgress, TaskInsert } from '../types';

export const tasksService = {
    async getAll(): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('is_completed', { ascending: true })
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getActive(): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('is_completed', false)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async create(task: TaskInsert): Promise<Task> {
        // Get max order_index of active tasks
        const { data: activeTasks } = await supabase
            .from('tasks')
            .select('order_index')
            .eq('is_completed', false)
            .order('order_index', { ascending: false })
            .limit(1);

        const nextOrder = activeTasks && activeTasks.length > 0 ? (activeTasks[0].order_index || 0) + 1 : 1;

        const { data, error } = await supabase
            .from('tasks')
            .insert({ ...task, order_index: nextOrder })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async update(id: string, updates: Partial<Task>): Promise<Task> {
        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async getProgress(taskId: string): Promise<TaskProgress[]> {
        const { data, error } = await supabase
            .from('task_progress')
            .select('*')
            .eq('task_id', taskId);

        if (error) throw error;
        return data || [];
    },

    async getAllProgress(): Promise<TaskProgress[]> {
        const { data, error } = await supabase
            .from('task_progress')
            .select('*');

        if (error) throw error;
        return data || [];
    },

    async toggleProgress(taskId: string, accountId: string, completed: boolean): Promise<TaskProgress> {
        const { data, error } = await supabase
            .from('task_progress')
            .upsert({
                task_id: taskId,
                account_id: accountId,
                completed,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'task_id, account_id'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async markAsCompleted(id: string): Promise<void> {
        // 1. Get the order_index of the task being completed
        const { data: taskToComplete } = await supabase
            .from('tasks')
            .select('order_index')
            .eq('id', id)
            .single();

        const completedOrder = taskToComplete?.order_index;

        // 2. Mark as completed and nullify order_index
        const { error: updateError } = await supabase
            .from('tasks')
            .update({ is_completed: true, order_index: null })
            .eq('id', id);

        if (updateError) throw updateError;

        // 3. Reindex remaining active tasks
        if (completedOrder !== null && completedOrder !== undefined) {
            const { data: remainingTasks } = await supabase
                .from('tasks')
                .select('id, order_index')
                .eq('is_completed', false)
                .gt('order_index', completedOrder)
                .order('order_index', { ascending: true });

            if (remainingTasks && remainingTasks.length > 0) {
                // Batch updates or sequential for safety
                for (const t of remainingTasks) {
                    const currentIdx = t.order_index ?? 0;
                    await supabase
                        .from('tasks')
                        .update({ order_index: Math.max(1, currentIdx - 1) })
                        .eq('id', t.id);
                }
            }
        }
    },

    async reactivate(id: string): Promise<void> {
        // 1. Get next available order_index
        const { data: activeTasks } = await supabase
            .from('tasks')
            .select('order_index')
            .eq('is_completed', false)
            .order('order_index', { ascending: false })
            .limit(1);

        const nextOrder = activeTasks && activeTasks.length > 0 ? (activeTasks[0].order_index || 0) + 1 : 1;

        // 2. Reactivate with new order
        const { error } = await supabase
            .from('tasks')
            .update({ is_completed: false, order_index: nextOrder })
            .eq('id', id);

        if (error) throw error;
    },

    async getDailyTasks(): Promise<Task[]> {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('show_in_daily', true)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return data || [];
    }
};
