import React, { useState } from 'react';
import { Button, Modal, Input } from '../../components/UI';
import { tasksService } from '../../services';
import './Tasks.css';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onTaskCreated }) => {
    const [name, setName] = useState('');
    const [isCore, setIsCore] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await tasksService.create({
                name: name.trim(),
                is_core: isCore
            });
            onTaskCreated();
            onClose();
            setName('');
            setIsCore(false);
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="New Task"
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
                        {loading ? 'Creating...' : 'Create Task'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateTaskModal;
