import React, { useState, useEffect } from 'react';
import { Button, Modal, Input } from '../../components/UI';
import { tasksService } from '../../services';
import type { Task } from '../../types';
import './Tasks.css';

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated: () => void;
    task: Task | null;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onTaskUpdated, task }) => {
    const [name, setName] = useState('');
    const [isCore, setIsCore] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (task) {
            setName(task.name);
            setIsCore(task.is_core);
        }
    }, [task]);

    if (!task) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await tasksService.update(task.id, {
                name: name.trim(),
                is_core: isCore
            });
            onTaskUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating task:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Task"
        >
            <form onSubmit={handleSubmit} className="task-form">
                <div className="form-group">
                    <label>Task Name</label>
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Weekly Quest, Daily Bosses..."
                        required
                        autoFocus
                    />
                </div>

                <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={isCore}
                            onChange={(e) => setIsCore(e.target.checked)}
                        />
                        <span className="custom-checkmark"></span>
                        <span>Es Tarea Core (Recomendada para nuevas cuentas)</span>
                    </label>
                </div>

                <div className="modal-actions">
                    <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default EditTaskModal;
