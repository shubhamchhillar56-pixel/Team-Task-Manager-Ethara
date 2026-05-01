import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, UserPlus, Trash2, Settings, Users, ListTodo
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import TaskCard from '../components/TaskCard';
import Badge from '../components/Badge';
import { SkeletonCard } from '../components/SkeletonLoader';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const EMPTY_TASK = {
  title: '', description: '', priority: 'medium',
  status: 'todo', dueDate: '', assignedTo: '',
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [memberModal, setMemberModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, task: null });
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('board');

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((r) => r.data),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`).then((r) => r.data),
  });

  const myRole = project?.members?.find(
    (m) => (m.user?._id || m.user)?.toString() === user?._id?.toString()
  )?.role;
  const isAdmin = myRole === 'admin';

  const taskMutation = useMutation({
    mutationFn: (data) =>
      taskModal.task
        ? api.put(`/projects/${projectId}/tasks/${taskModal.task._id}`, data)
        : api.post(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setTaskModal({ open: false, task: null });
      setTaskForm(EMPTY_TASK);
      toast.success(taskModal.task ? 'Task updated' : 'Task created');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Operation failed'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteModal({ open: false, task: null });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }) => api.post(`/projects/${projectId}/members`, { userId, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setUserSearch('');
      setSearchResults([]);
      toast.success('Member added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add member'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
      toast.success('Project deleted');
    },
  });

  const handleSearchUsers = async (q) => {
    setUserSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const { data } = await api.get(`/projects/search-users?q=${q}`);
      setSearchResults(data);
    } catch {}
  };

  const openCreateTask = () => {
    setTaskForm(EMPTY_TASK);
    setTaskModal({ open: true, task: null });
  };

  const openEditTask = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assignedTo: task.assignedTo?._id || '',
    });
    setTaskModal({ open: true, task });
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...taskForm,
      assignedTo: taskForm.assignedTo || null,
      dueDate: taskForm.dueDate || null,
    };
    taskMutation.mutate(payload);
  };

  const tasksByStatus = COLUMNS.reduce((acc, { key }) => {
    acc[key] = tasks?.filter((t) => t.status === key) || [];
    return acc;
  }, {});

  if (projLoading) return (
    <div className="space-y-4">
      <div className="h-8 skeleton rounded w-1/3" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  if (!project) return (
    <div className="text-center py-20 text-gray-400">Project not found</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/projects')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: project.color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-sm text-gray-500">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setMemberModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <Users className="w-4 h-4" /> Members
              </button>
              <button
                onClick={openCreateTask}
                className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" /> Task
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[{ key: 'board', icon: ListTodo, label: 'Board' }, { key: 'members', icon: Users, label: 'Members' }].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              activeTab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(({ key, label }) => (
            <div key={key} className="bg-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                <span className="text-xs bg-white text-gray-600 rounded-full w-6 h-6 flex items-center justify-center font-medium">
                  {tasksByStatus[key]?.length}
                </span>
              </div>
              {tasksLoading
                ? [1, 2].map((i) => <SkeletonCard key={i} />)
                : tasksByStatus[key]?.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
                : tasksByStatus[key].map((task) => {
                    const isAssigned = task.assignedTo?._id === user?._id;
                    return (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onEdit={openEditTask}
                        onDelete={(t) => setDeleteModal({ open: true, task: t })}
                        canEdit={isAdmin || isAssigned}
                        canDelete={isAdmin}
                      />
                    );
                  })
              }
            </div>
          ))}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {project.members.map((m) => {
            const memberUser = m.user;
            return (
              <div key={memberUser._id || memberUser} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center">
                  {memberUser.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{memberUser.name}</p>
                  <p className="text-xs text-gray-500">{memberUser.email}</p>
                </div>
                <Badge type="role" value={m.role} />
                {isAdmin && memberUser._id !== user._id && (
                  <button
                    onClick={() => removeMemberMutation.mutate(memberUser._id)}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
          {isAdmin && (
            <div className="px-5 py-4">
              <button
                onClick={() => setMemberModal(true)}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <UserPlus className="w-4 h-4" /> Add member
              </button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={taskModal.open} onClose={() => setTaskModal({ open: false, task: null })} title={taskModal.task ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          {/* Members editing an existing task can only change status */}
          {!isAdmin && taskModal.task && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg">
              As a member, you can only update the task status.
            </div>
          )}
          {(isAdmin || !taskModal.task) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  >
                    <option value="todo">To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  >
                    <option value="">Unassigned</option>
                    {project?.members?.map((m) => (
                      <option key={m.user._id || m.user} value={m.user._id || m.user}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
          {/* Member editing existing task: status only */}
          {!isAdmin && taskModal.task && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={taskForm.status}
                onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}
          <div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTaskModal({ open: false, task: null })} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={taskMutation.isPending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
            >
              {taskMutation.isPending ? 'Saving...' : taskModal.task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={memberModal} onClose={() => { setMemberModal(false); setUserSearch(''); setSearchResults([]); }} title="Add Member">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search users</label>
            <input
              value={userSearch}
              onChange={(e) => handleSearchUsers(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              placeholder="Search by name or email..."
            />
          </div>
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-50">
              {searchResults.map((u) => {
                const alreadyMember = project?.members?.some(
                  (m) => (m.user._id || m.user) === u._id
                );
                return (
                  <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold text-sm flex items-center justify-center">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    {alreadyMember ? (
                      <span className="text-xs text-gray-400">Already member</span>
                    ) : (
                      <button
                        onClick={() => addMemberMutation.mutate({ userId: u._id, role: 'member' })}
                        disabled={addMemberMutation.isPending}
                        className="text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-60"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, task: null })} title="Delete Task" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <span className="font-semibold">"{deleteModal.task?.title}"</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteModal({ open: false, task: null })} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">
              Cancel
            </button>
            <button
              onClick={() => deleteTaskMutation.mutate(deleteModal.task._id)}
              disabled={deleteTaskMutation.isPending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
            >
              {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
