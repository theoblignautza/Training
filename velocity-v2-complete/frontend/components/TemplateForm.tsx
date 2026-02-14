
import React, { useState, useEffect } from 'react';
import type { Template } from '../types';

interface TemplateFormProps {
  template?: Template | null;
  onSave: (template: Template | Omit<Template, 'ID'>) => void;
  onCancel: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    Name: '',
    Content: '',
  });

  useEffect(() => {
    if (template) {
      setFormData({
        Name: template.Name,
        Content: template.Content,
      });
    } else {
      setFormData({
        Name: '',
        Content: '',
      });
    }
  }, [template]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (template) {
        onSave({ ...template, ...formData });
    } else {
        onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="Name" className="block text-sm font-medium text-slate-300">Template Name</label>
        <input type="text" name="Name" id="Name" value={formData.Name} onChange={handleChange} required className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
      </div>
      <div>
        <label htmlFor="Content" className="block text-sm font-medium text-slate-300">Template Content</label>
        <textarea name="Content" id="Content" value={formData.Content} onChange={handleChange} required rows={10} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-colors">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">Save Template</button>
      </div>
    </form>
  );
};

export default TemplateForm;
