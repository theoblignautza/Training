import React from 'react';
import TopViewer from '../components/TopViewer';

const Topology: React.FC = () => {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <TopViewer embedded />
    </div>
  );
};

export default Topology;
