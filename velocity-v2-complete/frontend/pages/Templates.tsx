
import React, { useState, useEffect, useCallback } from 'react';
import { getTemplates, addTemplate, updateTemplate, deleteTemplate } from '../services/api';
import type { Template } from '../types';
import Modal from '../components/Modal';
import TemplateForm from '../components/TemplateForm';
import { useNotifications } from '../hooks/useNotifications';
import { PlusIcon, EditIcon, TrashIcon } from '../components/icons';

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const { addNotification } = useNotifications();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleOpenModal = (template?: Template) => {
    setEditingTemplate(template || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleSaveTemplate = async (templateData: Template | Omit<Template, 'ID'>) => {
    try {
      if ('ID' in templateData) {
        await updateTemplate(templateData.ID, templateData);
        addNotification('Template updated successfully.', 'success');
      } else {
        await addTemplate(templateData);
        addNotification('Template added successfully.', 'success');
      }
      fetchTemplates();
      handleCloseModal();
    } catch (error) {
      addNotification('Failed to save template.', 'error');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate(id);
        addNotification('Template deleted successfully.', 'success');
        fetchTemplates();
      } catch (error) {
        addNotification('Failed to delete template.', 'error');
      }
    }
  };

  const renderTableContent = () => {
    if (loading) {
      return <tr><td colSpan={2} className="text-center p-6">Loading templates...</td></tr>;
    }
    if (error) {
      return (
        <tr>
          <td colSpan={2} className="text-center p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchTemplates}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 transition-colors"
            >
              Retry
            </button>
          </td>
        </tr>
      );
    }
    if (templates.length === 0) {
      return <tr><td colSpan={2} className="text-center p-6">No templates found.</td></tr>;
    }
    return templates.map(template => (
      <tr key={template.ID} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50">
        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{template.Name}</td>
        <td className="px-6 py-4 text-right space-x-2">
          <button onClick={() => handleOpenModal(template)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors"><EditIcon /></button>
          <button onClick={() => handleDeleteTemplate(template.ID)} className="p-2 text-slate-400 hover:text-red-400 transition-colors"><TrashIcon /></button>
        </td>
      </tr>
    ));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Templates</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors"
        >
          <PlusIcon />
          Add Template
        </button>
      </div>

      <div className="bg-slate-800 shadow-md rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-700">
            <tr>
              <th scope="col" className="px-6 py-3">Template Name</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {renderTableContent()}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingTemplate ? 'Edit Template' : 'Add New Template'}>
        <TemplateForm template={editingTemplate} onSave={handleSaveTemplate} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default Templates;
